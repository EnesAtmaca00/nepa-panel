import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Copy, Image as ImageIcon, History, Star, Trash2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import AIProviderSelector from "./AIProviderSelector";
import AgentPipelineStatus from "./AgentPipelineStatus";
import { newWorkflowId, logAgentStep, runAuditor } from "@/lib/aiEngineHelpers";
import { loadCompanyContext } from "@/lib/companyContext";
import { useJobs } from "@/lib/JobsContext";

import { OPENROUTER_MODELS, MODEL_CAT_LABELS, MODEL_CATS_ORDER } from "@/lib/aiModels";

export default function ImagePromptGenerator({ companyId, companies = [] }) {
  const [data, setData] = useState({
    topic: "",
    include_text: false,
    text_content: "",
    text_placement: "merkez",
    include_logo: false,
    logo_placement: "alt-sağ",
    is_mockup: false,
    mockup_object: "",
    style: "fotoğraf gerçekçi",
    mood: "profesyonel",
    aspect_ratio: "1:1",
    ai_target: "midjourney",
    generator_provider: "auto",
    use_style_memory: true,
    refine: true,
    selected_model: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [styleMemory, setStyleMemory] = useState(null);
  const [pipelineSteps, setPipelineSteps] = useState({});
  const queryClient = useQueryClient();
  const { runJob, getJobByKey } = useJobs();
  const jobKey = companyId ? `imgprompt_${companyId}` : null;

  // Mount/firma değişince: arka planda süren veya biten işi geri yükle
  useEffect(() => {
    if (!jobKey) { setLoading(false); setPipelineSteps({}); return; }
    const job = getJobByKey(jobKey);
    if (!job) { setLoading(false); return; }
    if (job.status === "running") {
      setLoading(true);
      setPipelineSteps({ researcher: "completed", drafter: "running" });
    } else {
      setLoading(false);
      if (job.status === "done" && job.result) setResult(job.result);
      setPipelineSteps({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobKey]);

  // Firma seçilince StyleMemory yükle
  useEffect(() => {
    if (!companyId) { setStyleMemory(null); return; }
    base44.entities.StyleMemory.filter({ company_id: companyId }, "-updated_date", 1)
      .then(results => setStyleMemory(results?.[0] || null))
      .catch(() => setStyleMemory(null));
  }, [companyId]);

  const selectedCompany = companies.find(c => c.id === companyId);
  const previewColors = styleMemory?.dominant_colors?.length
    ? styleMemory.dominant_colors
    : (selectedCompany?.color_palette || []);

  const historyKey = ["ai-prompt-history", companyId];
  const { data: history = [] } = useQuery({
    queryKey: historyKey,
    queryFn: () => companyId
      ? base44.entities.AIPromptHistory.filter({ company_id: companyId }, "-created_date", 30)
      : Promise.resolve([]),
    initialData: [],
    enabled: !!companyId,
  });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const generate = () => {
    if (!companyId) { toast.error("Müşteri seç"); return; }
    if (!data.topic) { toast.error("Konu yaz"); return; }
    setLoading(true);
    setResult(null);
    setPipelineSteps({ researcher: "running" });
    const workflowId = newWorkflowId();
    const jobData = { ...data };
    const company = companies.find(c => c.id === companyId);

    runJob(
      async () => {
        // Researcher: firma bağlamını topla
        const { company: companyData, styleMemory: sm, firmaBaglam: fb } = await loadCompanyContext(companyId, companies);
        await logAgentStep({
          workflow_id: workflowId, agent_role: "researcher", status: "completed",
          related_entity_type: "AIPromptHistory", company_id: companyId,
          output_data: { has_style_memory: !!sm, has_firma_baglam: !!fb, topic: jobData.topic },
        });
        setPipelineSteps({ researcher: "completed", drafter: "running" });

        // Drafter: AI prompt üret
        const res = await base44.functions.invoke("generateImagePrompt", {
          ...jobData,
          company_id: companyId,
          generator_provider: jobData.generator_provider !== "auto" ? jobData.generator_provider : undefined,
          selected_model: jobData.selected_model || undefined,
        });

        await logAgentStep({
          workflow_id: workflowId, agent_role: "drafter", status: "completed",
          related_entity_type: "AIPromptHistory", company_id: companyId,
          output_data: { has_result: !!res.data?.final_prompt, ai_target: jobData.ai_target },
          model_used: res.data?.model || "",
        });
        setPipelineSteps({ researcher: "completed", drafter: "completed", auditor: "running" });

        // Auditor: marka uyum kontrolü
        let audit = null;
        if (companyData && res.data?.english_prompt) {
          try {
            audit = await runAuditor({
              idea: { title: jobData.topic, caption: res.data.english_prompt || res.data.final_prompt },
              company: companyData, workflowId,
            });
            setPipelineSteps(prev => ({ ...prev, auditor: "completed" }));
          } catch { setPipelineSteps(prev => ({ ...prev, auditor: "failed" })); }
        } else {
          setPipelineSteps(prev => ({ ...prev, auditor: "completed" }));
        }

        // Kalıcı kaydet
        try {
          await base44.entities.AIPromptHistory.create({
            company_id: companyId, company_name: company?.name,
            topic: jobData.topic, style: jobData.style, mood: jobData.mood,
            aspect_ratio: jobData.aspect_ratio, ai_target: jobData.ai_target,
            include_text: jobData.include_text, text_content: jobData.text_content,
            include_logo: jobData.include_logo, is_mockup: jobData.is_mockup,
            mockup_object: jobData.mockup_object,
            final_prompt: res.data?.final_prompt || "", negative_prompt: res.data?.negative_prompt || "",
            usage_tip: res.data?.usage_tip || "", model_used: res.data?.model || "",
          });
          queryClient.invalidateQueries({ queryKey: historyKey });
        } catch (saveErr) { console.error("Prompt history save failed", saveErr); }

        return { ...res.data, _audit: audit };
      },
      {
        key: jobKey,
        title: "Görsel prompt üretiliyor",
        page: `${company?.name || "Görsel"} · ${jobData.topic}`,
        href: "/ai-studio",
      },
      (err, jobResult) => {
        setLoading(false);
        if (err) {
          toast.error("Hata: " + (err.message || ""));
          setPipelineSteps({});
        } else {
          setResult(jobResult);
          toast.success("Görsel prompt hazır!");
        }
      }
    );
  };

  const copy = (txt) => { navigator.clipboard.writeText(txt); toast.success("Kopyalandı"); };

  const loadFromHistory = (item) => {
    setData({
      topic: item.topic || "",
      include_text: item.include_text || false,
      text_content: item.text_content || "",
      text_placement: "merkez",
      include_logo: item.include_logo || false,
      logo_placement: "alt-sağ",
      is_mockup: item.is_mockup || false,
      mockup_object: item.mockup_object || "",
      style: item.style || "fotoğraf gerçekçi",
      mood: item.mood || "profesyonel",
      aspect_ratio: item.aspect_ratio || "1:1",
      ai_target: item.ai_target || "midjourney",
      generator_provider: data.generator_provider || "auto",
      selected_model: data.selected_model || "",
      use_style_memory: true,
      refine: data.refine,
    });
    setResult({
      turkish_prompt: item.turkish_prompt || "",
      english_prompt: item.english_prompt || item.final_prompt,
      final_prompt: item.final_prompt,
      negative_prompt: item.negative_prompt,
      usage_tip: item.usage_tip,
    });
    toast.success("Geçmişten yüklendi");
  };

  const toggleFavorite = async (item) => {
    await base44.entities.AIPromptHistory.update(item.id, { favorite: !item.favorite });
    queryClient.invalidateQueries({ queryKey: historyKey });
  };

  const deleteHistory = async (id) => {
    if (!confirm("Bu prompt geçmişten silinecek")) return;
    await base44.entities.AIPromptHistory.delete(id);
    queryClient.invalidateQueries({ queryKey: historyKey });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardContent className="p-5 space-y-3">
          {/* StyleMemory preview */}
          {(styleMemory || previewColors.length > 0) && (
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 font-semibold">
                Marka Stil Hafızası
              </p>
              {previewColors.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  {previewColors.slice(0, 8).map((color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border shadow-sm"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
              {styleMemory?.mood_tags?.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium">Mood:</span> {styleMemory.mood_tags.join(", ")}
                </p>
              )}
              {styleMemory?.typography_style && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  <span className="font-medium">Tipo:</span> {styleMemory.typography_style}
                </p>
              )}
              {!styleMemory && (
                <p className="text-[10px] text-muted-foreground italic">
                  Henüz stil analizi yok — marka renkleri kullanılacak.
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="mb-1.5">Konu / Sahne</Label>
            <Textarea value={data.topic} onChange={(e) => set("topic", e.target.value)} placeholder="Örn: kahve fincanı, sabah masada..." rows={2} />
          </div>

          <div>
            <Label className="mb-1.5">Stil</Label>
            <Select value={data.style} onValueChange={(v) => set("style", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fotoğraf gerçekçi">Fotoğraf gerçekçi</SelectItem>
                <SelectItem value="3D render">3D Render</SelectItem>
                <SelectItem value="illüstrasyon">İllüstrasyon</SelectItem>
                <SelectItem value="minimal vektörel">Minimal vektörel</SelectItem>
                <SelectItem value="watercolor">Watercolor</SelectItem>
                <SelectItem value="cinematic">Cinematic</SelectItem>
                <SelectItem value="Y2K">Y2K</SelectItem>
                <SelectItem value="retro">Retro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1.5 text-xs">Mood</Label>
              <Select value={data.mood} onValueChange={(v) => set("mood", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parlak">Parlak</SelectItem>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="dramatic">Dramatic</SelectItem>
                  <SelectItem value="lüks">Lüks</SelectItem>
                  <SelectItem value="sıcak">Sıcak</SelectItem>
                  <SelectItem value="soğuk">Soğuk</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="vintage">Vintage</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="elegant">Elegant</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                  <SelectItem value="profesyonel">Profesyonel</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="calm">Calm</SelectItem>
                  <SelectItem value="mysterious">Mysterious</SelectItem>
                  <SelectItem value="romantic">Romantic</SelectItem>
                  <SelectItem value="futuristic">Futuristic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 text-xs">Oran</Label>
              <Select value={data.aspect_ratio} onValueChange={(v) => set("aspect_ratio", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1</SelectItem>
                  <SelectItem value="4:5">4:5</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="3:2">3:2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-sm">Yazı olsun</Label>
              <Switch checked={data.include_text} onCheckedChange={(v) => set("include_text", v)} />
            </div>
            {data.include_text && (
              <Input value={data.text_content} onChange={(e) => set("text_content", e.target.value)} placeholder="Görseldeki yazı..." />
            )}

            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-sm">Logo olsun</Label>
              <Switch checked={data.include_logo} onCheckedChange={(v) => set("include_logo", v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="cursor-pointer text-sm">Mockup modu</Label>
              <Switch checked={data.is_mockup} onCheckedChange={(v) => set("is_mockup", v)} />
            </div>
            {data.is_mockup && (
              <Input value={data.mockup_object} onChange={(e) => set("mockup_object", e.target.value)} placeholder="telefon, kupa, billboard..." />
            )}
          </div>

          <div className="border-t pt-3">
            <Label className="mb-1.5">Hedef Görsel AI</Label>
            <p className="text-[10px] text-muted-foreground mb-1.5">
              Promptu hangi görsel üretici AI'da kullanacaksın? (çıktı ona göre formatlanır)
            </p>
            <Select value={data.ai_target} onValueChange={(v) => set("ai_target", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">🎨 Görsel Modelleri</div>
                <SelectItem value="midjourney">Midjourney v6</SelectItem>
                <SelectItem value="flux">Flux 1.1 Pro</SelectItem>
                <SelectItem value="nano-banana">Nano Banana</SelectItem>
                <SelectItem value="nano-banana-2">Nano Banana 2</SelectItem>
                <SelectItem value="nano-banana-pro">Nano Banana Pro</SelectItem>
                <SelectItem value="ideogram">Ideogram v2</SelectItem>
                <SelectItem value="dalle">DALL-E 3</SelectItem>
                <SelectItem value="stable_diffusion">Stable Diffusion XL</SelectItem>
                <SelectItem value="leonardo">Leonardo AI</SelectItem>
                <SelectItem value="firefly">Adobe Firefly</SelectItem>
                <SelectItem value="recraft">Recraft V3</SelectItem>
                <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t">🤖 Çok Amaçlı (Görsel + Metin)</div>
                <SelectItem value="gemini_3_pro">Gemini 3 Pro Image</SelectItem>
                <SelectItem value="gemini_2_flash">Gemini 2.5 Flash Image</SelectItem>
                <SelectItem value="gpt5">GPT-5 (Vision)</SelectItem>
                <SelectItem value="gpt5_mini">GPT-5 Mini</SelectItem>
                <SelectItem value="claude_opus_4">Claude Opus 4</SelectItem>
                <SelectItem value="claude_sonnet_4">Claude Sonnet 4.5</SelectItem>
                <SelectItem value="generic">Generic (Tümü)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-3">
            <AIProviderSelector
              value={data.generator_provider}
              onChange={(v) => set("generator_provider", v)}
              label="Promptu Üreten AI"
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <Label className="cursor-pointer text-sm">Tarz hafızası</Label>
            <Switch checked={data.use_style_memory} onCheckedChange={(v) => set("use_style_memory", v)} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gold/10 border border-gold/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <div>
                <Label className="cursor-pointer text-sm block">İyileştirme Motoru</Label>
                <p className="text-[10px] text-muted-foreground">Kısa konuyu zenginleştirir + marka rengini garantiler</p>
              </div>
            </div>
            <Switch checked={data.refine} onCheckedChange={(v) => set("refine", v)} />
          </div>

          <Button onClick={generate} disabled={loading} className="w-full bg-gold text-slate-900 hover:bg-gold/90">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Üretiliyor...</> : <><Wand2 className="w-4 h-4 mr-2" /> Prompt Üret</>}
          </Button>
          {Object.keys(pipelineSteps).length > 0 && (
            <AgentPipelineStatus steps={pipelineSteps} />
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-3">
        {!result ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            Soldaki ayarlarla bir görsel prompt'u üret. Çıktıyı Midjourney/Flux/Ideogram'a yapıştırırsın.
          </CardContent></Card>
        ) : (
          <>
            {(result.refinement_note || result.refined_topic) && (
              <div className="flex items-start gap-2 rounded-lg bg-gold/10 border border-gold/30 px-3 py-2 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">İyileştirme Motoru:</span>{" "}
                  <span className="text-muted-foreground">{result.refinement_note || "Konu zenginleştirildi."}</span>
                  {result.refined_topic && (
                    <p className="text-muted-foreground mt-1 italic">Sahne: {result.refined_topic}</p>
                  )}
                </div>
              </div>
            )}
            {result.turkish_prompt && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">🇹🇷 Türkçe Açıklama</Label>
                    <Button size="sm" variant="outline" onClick={() => copy(result.turkish_prompt)}>
                      <Copy className="w-3 h-3 mr-1" /> Kopyala
                    </Button>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">{result.turkish_prompt}</div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs uppercase tracking-wide text-gold">🇬🇧 English Prompt</Label>
                  <Button size="sm" variant="outline" onClick={() => copy(result.english_prompt || result.final_prompt)}>
                    <Copy className="w-3 h-3 mr-1" /> Kopyala
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">{result.english_prompt || result.final_prompt}</div>
              </CardContent>
            </Card>

            {result.negative_prompt && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wide">Negative Prompt</Label>
                    <Button size="sm" variant="outline" onClick={() => copy(result.negative_prompt)}>
                      <Copy className="w-3 h-3 mr-1" /> Kopyala
                    </Button>
                  </div>
                  <div className="bg-muted p-3 rounded-lg font-mono text-xs whitespace-pre-wrap">{result.negative_prompt}</div>
                </CardContent>
              </Card>
            )}

            {result.usage_tip && (
              <Card><CardContent className="p-5">
                <Label className="text-xs uppercase tracking-wide mb-2 block">Kullanım Önerisi</Label>
                <p className="text-sm">{result.usage_tip}</p>
              </CardContent></Card>
            )}

            {result._audit && (
              <Card className={result._audit.passed ? "border-emerald-200" : "border-rose-200"}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wide">🛡 Denetçi Raporu</Label>
                    <span className={`text-sm font-bold ${result._audit.score >= 65 ? "text-emerald-600" : "text-rose-600"}`}>
                      {result._audit.score}/100
                    </span>
                  </div>
                  {result._audit.suggestions?.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {result._audit.suggestions.slice(0, 3).map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Geçmiş */}
        {history.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Geçmiş Promptlar ({history.length})</h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 hover:bg-muted/60 rounded border group cursor-pointer"
                    onClick={() => loadFromHistory(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.topic}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.style} • {item.ai_target} •{" "}
                          {format(new Date(item.created_date), "d MMM HH:mm", { locale: tr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                          className="p-1 hover:bg-yellow-100 rounded"
                        >
                          <Star className={`w-3 h-3 ${item.favorite ? "fill-yellow-400 text-yellow-500" : ""}`} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteHistory(item.id); }}
                          className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}