import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Download, Check, HardDriveUpload, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const ASPECT_OPTIONS = [
  { value: "1:1", label: "1:1 — Kare (Instagram Post)", w: 1024, h: 1024 },
  { value: "9:16", label: "9:16 — Dikey (Reels/Story)", w: 576, h: 1024 },
  { value: "16:9", label: "16:9 — Yatay (YouTube/LinkedIn)", w: 1024, h: 576 },
  { value: "4:5", label: "4:5 — Portrait (Instagram)", w: 864, h: 1080 },
];

const STYLE_OPTIONS = [
  { value: "modern minimal", label: "Modern & Minimalist" },
  { value: "vibrant colorful", label: "Canlı & Renkli" },
  { value: "professional corporate", label: "Profesyonel & Kurumsal" },
  { value: "lifestyle warm photography", label: "Lifestyle & Sıcak" },
  { value: "bold typographic", label: "Kalın Typography Odaklı" },
  { value: "dark elegant cinematic", label: "Koyu & Elegans" },
];

// Pollinations.ai — tamamen ücretsiz, API key gerektirmez
function buildPollinationsUrl(prompt, w, h) {
  const seed = Math.floor(Math.random() * 9999999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}&enhance=true`;
}

export default function ContentImageGenerator({ idea, company, onSave }) {
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState("1:1");
  const [style, setStyle] = useState("modern minimal");
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [driveUrl, setDriveUrl] = useState(null);
  const [savingToDrive, setSavingToDrive] = useState(false);

  const selectedAspect = ASPECT_OPTIONS.find(o => o.value === aspect) || ASPECT_OPTIONS[0];

  const buildAutoPrompt = () => {
    const caption = idea?.caption || idea?.topic || idea?.title || "";
    const brandDesc = company?.brand_description || "";
    const sector = company?.sector || "";
    const styleLabel = STYLE_OPTIONS.find(s => s.value === style)?.label || style;
    return `Social media visual for ${company?.name || "brand"} in ${sector} sector. ${caption.slice(0, 150)}. ${brandDesc.slice(0, 80)}. Style: ${style}. ${styleLabel}. No text overlays. Professional quality. High resolution.`;
  };

  const generate = async () => {
    setGenerating(true);
    setGeneratedUrl(null);
    setDriveUrl(null);
    try {
      const finalPrompt = prompt.trim() || buildAutoPrompt();
      const url = buildPollinationsUrl(finalPrompt, selectedAspect.w, selectedAspect.h);
      // Görseli önceden yükleyerek hazır olduğunu doğrula
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      setGeneratedUrl(url);
      toast.success("Görsel oluşturuldu!");
    } catch (err) {
      toast.error("Görsel oluşturulamadı, tekrar dene");
    } finally {
      setGenerating(false);
    }
  };

  const saveToDrive = async () => {
    if (!generatedUrl || !company?.id) return;
    setSavingToDrive(true);
    try {
      const finalPrompt = prompt.trim() || buildAutoPrompt();
      const filename = `AI-${idea?.title?.slice(0, 30) || "gorsel"}-${Date.now()}.jpg`;
      const res = await base44.functions.invoke("uploadImageUrlToDrive", {
        company_id: company.id,
        image_url: generatedUrl,
        filename,
        subfolder: "AI Görseller",
        source: "ai_generated",
      });
      const data = res.data || res;
      if (!data.success) throw new Error(data.error || "Drive yükleme başarısız");
      setDriveUrl(data.drive_url);

      // MediaAsset'e kaydet (Drive URL ile)
      await base44.entities.MediaAsset.create({
        company_id: company.id,
        company_name: company.name,
        file_url: data.direct_url,
        thumbnail_url: data.preview_url,
        file_type: "image",
        source: "ai_generated",
        title: idea?.title ? `AI: ${idea.title}` : "AI Üretilen Görsel",
        category: "graphic",
        tags: ["ai", "pollinations"],
        ai_prompt: finalPrompt.slice(0, 500),
      });

      toast.success("Drive'a kaydedildi!");
    } catch (err) {
      toast.error("Drive kaydı başarısız: " + err.message);
    } finally {
      setSavingToDrive(false);
    }
  };

  const saveToContent = async () => {
    if (!generatedUrl || !onSave) return;
    setSaving(true);
    try {
      // Önce Drive'a yükle, Drive URL'ini içeriğe kaydet
      let urlToSave = generatedUrl;
      if (company?.id && company?.drive_folder_id) {
        try {
          const finalPrompt = prompt.trim() || buildAutoPrompt();
          const filename = `AI-${idea?.title?.slice(0, 30) || "gorsel"}-${Date.now()}.jpg`;
          const res = await base44.functions.invoke("uploadImageUrlToDrive", {
            company_id: company.id,
            image_url: generatedUrl,
            filename,
            subfolder: "AI Görseller",
            source: "ai_generated",
          });
          const data = res.data || res;
          if (data.success) {
            urlToSave = data.direct_url;
            setDriveUrl(data.drive_url);
            await base44.entities.MediaAsset.create({
              company_id: company.id,
              company_name: company.name,
              file_url: data.direct_url,
              thumbnail_url: data.preview_url,
              file_type: "image",
              source: "ai_generated",
              title: idea?.title ? `AI: ${idea.title}` : "AI Üretilen Görsel",
              category: "graphic",
              tags: ["ai", "pollinations"],
              ai_prompt: finalPrompt.slice(0, 500),
            });
          }
        } catch (driveErr) {
          console.warn("Drive yükleme başarısız, orijinal URL kullanılıyor:", driveErr.message);
        }
      }
      await onSave(urlToSave);
      toast.success("Görsel içerik planına kaydedildi");
    } catch (err) {
      toast.error("Kaydetme hatası: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
        <span className="font-medium">Pollinations.ai</span> — Ücretsiz görsel üretimi. Kredi kullanmaz.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 text-xs">Boyut</Label>
          <Select value={aspect} onValueChange={setAspect}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASPECT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 text-xs">Stil</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STYLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-1.5 text-xs">
          Özel Prompt (boş bırakırsan otomatik oluşturulur)
        </Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className="text-xs"
          placeholder={buildAutoPrompt().slice(0, 120) + "..."}
        />
      </div>

      <Button onClick={generate} disabled={generating} className="w-full gap-2" size="sm">
        {generating ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Görsel Oluşturuluyor...</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" /> Görsel Oluştur (Ücretsiz)</>
        )}
      </Button>

      {generatedUrl && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border bg-muted/30">
            <img src={generatedUrl} alt="AI Görseli" className="w-full object-cover max-h-64" />
          </div>

          {driveUrl && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
              <Check className="w-3 h-3" /> Drive'a kaydedildi —
              <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="underline">Görüntüle</a>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs gap-1"
              onClick={() => window.open(generatedUrl, "_blank")}>
              <ExternalLink className="w-3 h-3" /> Önizle
            </Button>

            {company?.drive_folder_id && !driveUrl && (
              <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 text-blue-700 border-blue-300"
                onClick={saveToDrive} disabled={savingToDrive}>
                {savingToDrive ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDriveUpload className="w-3 h-3" />}
                Drive'a Kaydet
              </Button>
            )}

            {onSave && (
              <Button size="sm" className="flex-1 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={saveToContent} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                İçeriğe Ekle
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}