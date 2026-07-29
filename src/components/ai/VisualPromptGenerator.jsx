import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, ImageIcon, Layers, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import BrandComplianceCheck from "@/components/ai/BrandComplianceCheck";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Kare)", desc: "Instagram Post" },
  { value: "4:5", label: "4:5 (Portre)", desc: "Instagram Post Dikey" },
  { value: "9:16", label: "9:16 (Dikey)", desc: "Story / Reels / TikTok" },
  { value: "16:9", label: "16:9 (Yatay)", desc: "YouTube / LinkedIn" },
  { value: "1.91:1", label: "1.91:1", desc: "Facebook / LinkedIn Link" },
  { value: "3:4", label: "3:4", desc: "Pinterest" },
];

function copyToClipboard(text) {
  navigator.clipboard.writeText(text || "");
  toast.success("Kopyalandı");
}

export default function VisualPromptGenerator({ idea, company, settings }) {
  const [mode, setMode] = useState(null); // null | "template_free" | "complete"
  const [ratio, setRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const close = () => { setMode(null); setResult(null); };

  const generate = async (selectedMode) => {
    if (!idea?.title) return;
    setMode(selectedMode);
    setLoading(true);
    setResult(null);

    const ratioInfo = ASPECT_RATIOS.find(r => r.value === ratio);

    const isTemplateFree = selectedMode === "template_free";

    const systemPrompt = isTemplateFree
      ? `You are a world-class AI image prompt engineer. You create prompts for AI image generation tools (Midjourney, DALL-E, Flux, Stable Diffusion, etc.).

YOUR TASK: Create a TEMPLATE-FREE visual prompt — meaning a clean background image or scene WITHOUT any text overlays, logos, icons, or graphic design elements. This image will be used as a BACKGROUND or BASE VISUAL for a social media post design. The designer will add text, logos and branding elements later in Canva/Figma/Photoshop.

RULES:
- NO text, typography, letters, words, or numbers in the image
- NO logos, watermarks, or brand marks
- NO UI elements, buttons, or overlays
- Focus on: composition, lighting, mood, colors, textures, atmosphere
- Leave visual "breathing room" for text placement (negative space)
- The image should evoke the right emotion/mood for the content topic
- Match the brand's color palette and visual identity when provided`

      : `You are a world-class AI image prompt engineer. You create prompts for AI image generation tools (Midjourney, DALL-E, Flux, Stable Diffusion, etc.).

YOUR TASK: Create a COMPLETE DESIGN prompt — a fully finished social media graphic that includes ALL elements: text overlays, headlines, call-to-action text, logo placement, icons, decorative elements, and the background scene. This should look like a READY-TO-POST professional social media design.

RULES:
- INCLUDE main headline/title text on the image
- INCLUDE call-to-action text if applicable
- INCLUDE brand logo placement (describe where)
- INCLUDE relevant icons, graphics, decorative elements
- Specify typography style, font weight, text colors
- Specify exact text content to appear on the image
- Design a complete, polished layout — not just a background
- This should look like a professional designer created it in Canva/Figma`;

    const brandContext = [];
    if (company?.name) brandContext.push(`Brand: ${company.name}`);
    if (company?.sector) brandContext.push(`Sector: ${company.sector}`);
    if (company?.color_palette?.length) brandContext.push(`Brand Colors: ${company.color_palette.join(", ")}`);
    if (company?.brand_keywords?.length) brandContext.push(`Keywords: ${company.brand_keywords.join(", ")}`);
    if (company?.target_audience) brandContext.push(`Target Audience: ${company.target_audience}`);

    const captionText = idea.captions?.TR || Object.values(idea.captions || {})[0] || "";
    const hookText = idea.hook || "";

    const userPrompt = `CREATE A ${isTemplateFree ? "TEMPLATE-FREE BACKGROUND" : "COMPLETE READY-TO-POST DESIGN"} PROMPT

━━━ CONTENT IDEA ━━━
Title: ${idea.title}
${hookText ? `Hook: ${hookText}` : ""}
${idea.brief ? `Brief: ${idea.brief}` : ""}
${captionText ? `Caption excerpt: ${captionText.substring(0, 200)}` : ""}
Platform: ${idea.platform || "instagram_post"}
Content Pillar: ${idea.content_pillar || "general"}

━━━ BRAND CONTEXT ━━━
${brandContext.join("\n") || "No specific brand context"}

━━━ SPECIFICATIONS ━━━
Aspect Ratio: ${ratio} (${ratioInfo?.desc || ""})
${isTemplateFree
  ? "Style: Clean, atmospheric, with negative space for text overlay. No text/logos/icons in the image."
  : `Style: Complete graphic design with text overlays.
Main headline to include: "${idea.title}"
${hookText ? `Subtext/hook: "${hookText.substring(0, 80)}"` : ""}
Include brand logo placement and CTA if relevant.`}

━━━ OUTPUT FORMAT ━━━
Return this exact JSON:
{
  "prompt_en": "<Detailed English prompt for the AI image tool — 3-5 sentences covering subject, composition, lighting, style, mood, colors, atmosphere${isTemplateFree ? ', negative space for text' : ', text placement, typography, logo position, layout structure'}>",
  "prompt_tr": "<Same prompt in Turkish — detailed scene description>",
  "negative_prompt": "<Things to avoid — quality issues, unwanted elements>",
  "recommended_tool": "<Best AI tool for this: Midjourney/DALL-E/Flux/Ideogram>",
  "design_notes": "<1-2 sentence tip for the designer in Turkish>"
}`;

    try {
      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "image_prompt",
        system_prompt: systemPrompt,
        prompt: userPrompt,
        json_mode: true,
        skip_cache: true,
      });

      const aiData = res.data || res;
      if (aiData?.error) throw new Error(aiData.error);

      let parsed = null;
      const raw = aiData.result || "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      try { parsed = JSON.parse(cleaned); } catch (_) {
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        if (s !== -1 && e > s) try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (_2) {}
      }

      if (!parsed) throw new Error("AI yanıtı okunamadı");
      setResult({ ...parsed, model: aiData.model_used || "" });
    } catch (e) {
      toast.error("Prompt üretim hatası: " + e.message);
      setMode(null);
    } finally {
      setLoading(false);
    }
  };

  // Kapalı durum — sadece butonlar
  if (!mode) {
    return (
      <div className="border-t pt-3 mt-1">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Tasarım İçin Görsel Prompt</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Boyut:</Label>
          <Select value={ratio} onValueChange={setRatio}>
            <SelectTrigger className="h-7 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted-foreground ml-1">({r.desc})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => generate("template_free")}
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
            Templatesiz Görsel Prompt
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
            onClick={() => generate("complete")}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Komple Tasarım Promptu
          </Button>
        </div>
      </div>
    );
  }

  const isTemplateFree = mode === "template_free";
  const modeLabel = isTemplateFree ? "Templatesiz Görsel" : "Komple Tasarım";
  const modeColor = isTemplateFree ? "blue" : "purple";

  // Yükleniyor veya sonuç
  return (
    <div className="border-t pt-3 mt-1 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isTemplateFree
            ? <ImageIcon className={`w-4 h-4 text-${modeColor}-600`} />
            : <Layers className={`w-4 h-4 text-${modeColor}-600`} />}
          <span className={`text-xs font-semibold text-${modeColor}-700`}>{modeLabel} Promptu</span>
          <Badge variant="outline" className="text-[10px]">{ratio}</Badge>
        </div>
        <button onClick={close} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading && (
        <div className={`flex items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed ${
          isTemplateFree ? "border-blue-200 bg-blue-50/30" : "border-purple-200 bg-purple-50/30"
        }`}>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Görsel prompt üretiliyor...</span>
        </div>
      )}

      {result && (
        <div className="space-y-2.5">
          {/* EN Prompt */}
          <div className={`rounded-lg border p-3 ${isTemplateFree ? "bg-blue-50/40 border-blue-200" : "bg-purple-50/40 border-purple-200"}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🇬🇧 English Prompt</span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => copyToClipboard(result.prompt_en)}>
                <Copy className="w-2.5 h-2.5 mr-1" /> Kopyala
              </Button>
            </div>
            <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap">{result.prompt_en}</p>
          </div>

          {/* TR Prompt */}
          {result.prompt_tr && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">🇹🇷 Türkçe Açıklama</span>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => copyToClipboard(result.prompt_tr)}>
                  <Copy className="w-2.5 h-2.5 mr-1" /> Kopyala
                </Button>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{result.prompt_tr}</p>
            </div>
          )}

          {/* Negative + Notlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.negative_prompt && (
              <div className="rounded border p-2 bg-rose-50/30 border-rose-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-rose-600">Negative Prompt</span>
                  <button onClick={() => copyToClipboard(result.negative_prompt)} className="text-[10px] text-rose-500 hover:underline">Kopyala</button>
                </div>
                <p className="text-[11px] text-rose-700">{result.negative_prompt}</p>
              </div>
            )}
            <div className="rounded border p-2 bg-muted/30 space-y-1">
              {result.recommended_tool && (
                <p className="text-[11px]"><span className="font-semibold">🎯 Önerilen Araç:</span> {result.recommended_tool}</p>
              )}
              {result.design_notes && (
                <p className="text-[11px]"><span className="font-semibold">💡 Not:</span> {result.design_notes}</p>
              )}
              {result.model && (
                <p className="text-[10px] text-muted-foreground">Model: {result.model.split("/").pop()}</p>
              )}
            </div>
          </div>

          {/* Marka Tasarım Uyumu Denetimi */}
          <div className="pt-1">
            <BrandComplianceCheck prompt={result.prompt_en || result.prompt_tr} company={company} />
          </div>

          {/* Diğer modu dene */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className={`text-[11px] h-7 ${isTemplateFree ? "border-purple-200 text-purple-600" : "border-blue-200 text-blue-600"}`}
              onClick={() => generate(isTemplateFree ? "complete" : "template_free")}
            >
              {isTemplateFree ? <><Layers className="w-3 h-3 mr-1" /> Komple Tasarım</> : <><ImageIcon className="w-3 h-3 mr-1" /> Templatesiz</>}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] h-7"
              onClick={() => generate(mode)}
            >
              🔄 Yeniden Üret
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}