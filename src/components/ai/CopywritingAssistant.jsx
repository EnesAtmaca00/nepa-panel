import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Sparkles, RefreshCw, PenLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { loadCompanyContext, buildAISystemPrompt } from "@/lib/companyContext";
import { newWorkflowId, logAgentStep, runAuditor } from "@/lib/aiEngineHelpers";
import AIProviderSelector from "./AIProviderSelector";
import AgentPipelineStatus from "./AgentPipelineStatus";
import { useJobs } from "@/lib/JobsContext";

const CONTENT_TYPES = [
  { value: "instagram_caption", label: "Instagram Açıklaması" },
  { value: "facebook_post", label: "Facebook Paylaşımı" },
  { value: "linkedin_post", label: "LinkedIn Paylaşımı" },
  { value: "tweet", label: "X (Twitter) Tweet" },
  { value: "email_subject", label: "E-posta Başlığı" },
  { value: "email_body", label: "E-posta İçeriği" },
  { value: "ad_copy", label: "Reklam Metni" },
  { value: "blog_intro", label: "Blog Girişi" },
  { value: "product_description", label: "Ürün Açıklaması" },
  { value: "slogan", label: "Slogan / Tagline" },
];

const TONES = [
  { value: "professional", label: "Profesyonel" },
  { value: "friendly", label: "Samimi & Sıcak" },
  { value: "energetic", label: "Enerjik & Dinamik" },
  { value: "luxurious", label: "Lüks & Prestijli" },
  { value: "humorous", label: "Eğlenceli & Espirili" },
  { value: "inspiring", label: "İlham Verici" },
  { value: "urgent", label: "Acil / Harekete Geçirici" },
];

const LANGUAGES = [
  { value: "tr", label: "🇹🇷 Türkçe" },
  { value: "en", label: "🇬🇧 İngilizce" },
  { value: "fr", label: "🇫🇷 Fransızca" },
  { value: "nl", label: "🇳🇱 Felemenkçe" },
  { value: "de", label: "🇩🇪 Almanca" },
];

export default function CopywritingAssistant({ companyId, companies = [] }) {
  const [brief, setBrief] = useState("");
  const [contentType, setContentType] = useState("instagram_caption");
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("tr");
  const [variants, setVariants] = useState(3);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [generatorProvider, setGeneratorProvider] = useState("auto");
  const [savingIdx, setSavingIdx] = useState(null);
  const [pipelineSteps, setPipelineSteps] = useState({});
  const { runJob, getJobByKey } = useJobs();
  const jobKey = `copywriting_${companyId || "genel"}`;

  const company = companies.find(c => c.id === companyId);

  // Mount/firma değişince: arka planda süren veya biten işi geri yükle
  useEffect(() => {
    const job = getJobByKey(jobKey);
    if (!job) { setLoading(false); return; }
    if (job.status === "running") {
      setLoading(true);
      setPipelineSteps({ researcher: "completed", drafter: "running" });
    } else {
      setLoading(false);
      if (job.status === "done" && Array.isArray(job.result)) setResults(job.result);
      setPipelineSteps({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobKey]);

  const generate = () => {
    if (!brief.trim()) { toast.error("Lütfen bir brief/konu girin"); return; }
    setLoading(true);
    setResults([]);
    setPipelineSteps({ researcher: "running" });
    const workflowId = newWorkflowId();
    const jobBrief = brief;
    const jobContentType = contentType;
    const jobTone = tone;
    const jobLanguage = language;
    const jobVariants = variants;
    const jobProvider = generatorProvider;

    runJob(
      async () => {
      // Researcher: firma bağlamını topla
      const { styleMemory, firmaBaglam } = await loadCompanyContext(companyId, companies);
      await logAgentStep({
        workflow_id: workflowId,
        agent_role: "researcher",
        status: "completed",
        related_entity_type: "ContentIdea",
        company_id: companyId,
        output_data: { has_style_memory: !!styleMemory, has_firma_baglam: !!firmaBaglam, brief_length: jobBrief.length },
      });
      setPipelineSteps({ researcher: "completed", drafter: "running" });

      const systemPrompt = buildAISystemPrompt("copywriting", company, styleMemory, firmaBaglam);

      const prompt = `GÖREV:
İçerik türü: ${CONTENT_TYPES.find(t => t.value === jobContentType)?.label}
Ton: ${TONES.find(t => t.value === jobTone)?.label}
Dil: ${LANGUAGES.find(l => l.value === jobLanguage)?.label}
Varyant sayısı: ${jobVariants}

BRIEF / KONU:
${jobBrief}

${jobVariants} farklı varyant üret. Her varyant birbirinden FARKLI bir yaklaşım, başlık ve içerik stratejisi kullansın.
Marka sesini, hedef kitleyi ve iletişim bilgilerini gerektiğinde doğal şekilde entegre et.
Yasaklı kelimelerden kaçın, marka tonunu koru.

JSON formatında döndür:
{
  "variants": [
    {
      "title": "Varyant başlığı/yaklaşımı",
      "content": "Metin içeriği — CTA dahil",
      "hook": "İlk dikkat çekici cümle/kelimeler — scroll durdurucu",
      "tip": "Bu varyantın güçlü yanı ve hangi durumda kullanılmalı",
      "tone_match": "Bu varyant markanın hangi yönünü yansıtıyor"
    }
  ]
}`;

      // Drafter: AI metin üret
      const response = await base44.functions.invoke("aiInvoke", {
        task_type: "copywriting",
        system_prompt: systemPrompt,
        prompt,
        json_mode: true,
        provider_override: jobProvider !== "auto" ? jobProvider : undefined,
      });

      let data = response.data?.result;
      const modelUsed = response.data?.model_used || "";
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (_) {}
      }
      const parsedVariants = data?.variants || [];
      setResults(parsedVariants);

      await logAgentStep({
        workflow_id: workflowId,
        agent_role: "drafter",
        status: "completed",
        related_entity_type: "ContentIdea",
        company_id: companyId,
        output_data: { variants_count: parsedVariants.length },
        model_used: modelUsed,
      });
      setPipelineSteps({ researcher: "completed", drafter: "completed", auditor: "running" });

      // Auditor: her varyantı kontrol et (await — sonuç job'a dahil olsun)
      let finalVariants = parsedVariants;
      if (company && parsedVariants.length > 0) {
        const audits = await Promise.all(
          parsedVariants.map((v) =>
            runAuditor({ idea: { title: v.title, caption: v.content }, company, workflowId })
              .catch(() => null)
          )
        );
        finalVariants = parsedVariants.map((v, i) => audits[i] ? { ...v, _audit: audits[i] } : v);
        setResults(finalVariants);
      }
      setPipelineSteps({ researcher: "completed", drafter: "completed", auditor: "completed" });

      return finalVariants;
      },
      {
        key: jobKey,
        title: "Metin üretiliyor",
        page: `${company?.name || "Genel"} · ${CONTENT_TYPES.find(t => t.value === jobContentType)?.label || ""}`,
        href: "/ai-studio",
      },
      (err, result) => {
        setLoading(false);
        if (err) {
          toast.error("Üretim başarısız: " + (err.message || ""));
          setPipelineSteps({});
        } else {
          setResults(result || []);
          toast.success("Metinler hazır!");
        }
      }
    );
  };

  const copyText = (text) => { navigator.clipboard.writeText(text); toast.success("Kopyalandı!"); };

  const saveToCalendar = async (variant, idx) => {
    if (!companyId) { toast.error("Takvime eklemek için firma seç"); return; }
    setSavingIdx(idx);
    try {
      const platformMap = {
        instagram_caption: "instagram_post",
        facebook_post: "facebook",
        linkedin_post: "linkedin",
        tweet: "x",
      };
      await base44.entities.ContentIdea.create({
        company_id: companyId,
        company_name: company?.name,
        title: variant.title || brief.slice(0, 60),
        platform: platformMap[contentType] || "instagram_post",
        topic: brief,
        hook: variant.hook || "",
        caption: variant.content,
        scheduled_date: new Date().toISOString().split("T")[0],
        work_status: "not_started",
        approval_mode: company?.default_approval_mode || "manual_internal",
        approval_status: company?.default_approval_mode === "none" ? "approved" : "pending_internal",
      });
      toast.success("Takvime eklendi ✓");
    } catch (_) {
      toast.error("Eklenemedi");
    } finally {
      setSavingIdx(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <div>
          <Label className="mb-1.5">İçerik Türü</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Ton / Tarz</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Dil</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Varyant Sayısı</Label>
          <Select value={String(variants)} onValueChange={v => setVariants(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Varyant</SelectItem>
              <SelectItem value="2">2 Varyant</SelectItem>
              <SelectItem value="3">3 Varyant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Brief / Konu Açıklaması</Label>
          <Textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Örn: Bu ay yeni koleksiyonumuzu tanıtacağız, hedef kitle 25-40 yaş arası kadınlar..."
            className="h-32 resize-none"
          />
        </div>

        <AIProviderSelector value={generatorProvider} onChange={setGeneratorProvider} />

        <Button className="w-full gap-2" onClick={generate} disabled={loading || !brief.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Üretiliyor..." : "Metin Üret"}
        </Button>

        {Object.keys(pipelineSteps).length > 0 && (
          <AgentPipelineStatus steps={pipelineSteps} />
        )}

        {results.length > 0 && (
          <Button variant="outline" className="w-full gap-2" onClick={generate} disabled={loading}>
            <RefreshCw className="w-4 h-4" /> Yeniden Üret
          </Button>
        )}
      </div>

      <div className="lg:col-span-2 space-y-4">
        {loading && (
          <Card><CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
            <span className="text-sm">Metinler üretiliyor...</span>
          </CardContent></Card>
        )}

        {!loading && results.length === 0 && (
          <Card><CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <PenLine className="w-10 h-10 text-muted-foreground/30" />
            <span className="text-sm">Brief girin ve metinleri üretin</span>
          </CardContent></Card>
        )}

        {results.map((r, i) => (
          <Card key={i} className="relative">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <Badge className="bg-gold/20 text-gold border-gold/30 mb-1">Varyant {i + 1}</Badge>
                  {r.title && <h3 className="font-semibold text-sm">{r.title}</h3>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyText(r.content)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  {companyId && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveToCalendar(r, i)} disabled={savingIdx === i}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {r.hook && (
                <div className="mb-2 p-2 rounded bg-muted text-xs text-muted-foreground">
                  <span className="font-semibold">Hook:</span> {r.hook}
                </div>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-wrap border rounded-lg p-3 bg-background">{r.content}</p>

              {r.tip && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-gold" /> {r.tip}
                </div>
              )}
              {r.tone_match && (
                <div className="mt-1 text-[10px] text-muted-foreground/70 italic">🎯 {r.tone_match}</div>
              )}
              {r._audit && (
                <div className={`mt-2 text-[10px] px-2 py-1 rounded border ${
                  r._audit.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  🛡 Auditor: {r._audit.score}/100
                  {r._audit.suggestions?.[0] && <span className="ml-1">— {r._audit.suggestions[0]}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}