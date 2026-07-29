import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Plus, Rocket, History, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { toast } from "sonner";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/format";
import { OPENROUTER_MODELS, MODEL_CAT_LABELS, MODEL_CATS_ORDER } from "@/lib/aiModels";
import AIProviderSelector from "./AIProviderSelector";
import PillarBadge from "@/components/content/PillarBadge";
import MixResultCard from "./MixResultCard";
import {
  newWorkflowId,
  logAgentStep,
  checkContentPillarBalance,
  fetchRecentTitles,
  runAuditor,
  runReviewerAutoApprove,
} from "@/lib/aiEngineHelpers";
import { loadCompanyContext, buildAISystemPrompt } from "@/lib/companyContext";
import { stripThinkBlocks, pollinationsGorselUrl } from "@/lib/intelligenceLayer";
import { useJobs } from "@/lib/JobsContext";

const TONES = [
  "samimi", "resmi", "esprili", "cesur", "bilgilendirici", "motive edici",
  "eğitici", "ilham verici", "provokatif", "nostaljik", "lüks", "minimalist",
  "eğlenceli", "duygusal", "güven veren", "enerjik",
];

const TYPE_GROUPS = {
  "📸 Görsel": ["Carousel", "Statik Post", "Infografik", "Ürün Vitrini"],
  "🎬 Video": ["Reels", "Story", "Video", "Tutorial"],
  "💬 Etkileşim": ["Anket", "Soru-Cevap", "UGC", "Çekiliş"],
  "✍️ Metin": ["Alıntı", "Sahne Arkası", "Müşteri Yorumu", "Etkinlik"],
};

function extractJSON(text) {
  if (!text) return null;
  const cleaned = stripThinkBlocks(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1) return null;
  // 1) Düz parse dene
  if (last !== -1) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { /* devam */ }
  }
  // 2) Kesik JSON kurtarma — token limitine takılan yanıtlarda son tam "idea" objesine kadar topla
  try {
    const ideasMatch = cleaned.match(/"ideas"\s*:\s*\[([\s\S]*)/);
    if (ideasMatch) {
      const body = ideasMatch[1];
      const objects = [];
      let depth = 0, start = -1;
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === "{") { if (depth === 0) start = i; depth++; }
        else if (ch === "}") {
          depth--;
          if (depth === 0 && start !== -1) {
            const slice = body.slice(start, i + 1);
            try { objects.push(JSON.parse(slice)); } catch { /* yarım obje atla */ }
            start = -1;
          }
        }
      }
      if (objects.length > 0) return { ideas: objects };
    }
  } catch { /* yut */ }
  return null;
}

export default function MixGenerator({ companyId, companies = [] }) {
  const [mode, setMode] = useState("specific");
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState(["instagram_post"]);
  const [contentType, setContentType] = useState("Carousel");
  const [tone, setTone] = useState("samimi");
  const [languages, setLanguages] = useState(["TR"]);
  const [count, setCount] = useState(1);
  const [useStyle, setUseStyle] = useState(true);
  const [avoidRecent, setAvoidRecent] = useState(true);
  const [generatorProvider, setGeneratorProvider] = useState("auto");
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [pillarWarning, setPillarWarning] = useState(null);
  const [activeLogId, setActiveLogId] = useState(null);
  const queryClient = useQueryClient();
  const { runJob, getJobByKey } = useJobs();
  const jobKey = companyId ? `mix_${companyId}` : null;

  const company = companies.find(c => c.id === companyId);

  // Pillar dengesi
  useEffect(() => {
    if (!companyId) { setPillarWarning(null); return; }
    checkContentPillarBalance(companyId).then(({ suggestion }) => {
      setPillarWarning(suggestion?.reason || null);
    });
  }, [companyId]);

  // Mount/firma değişince: arka planda süren veya biten işi geri yükle
  useEffect(() => {
    if (!jobKey) { setLoading(false); return; }
    const job = getJobByKey(jobKey);
    if (!job) { setLoading(false); return; }
    if (job.status === "running") {
      setLoading(true);
    } else {
      setLoading(false);
      if (job.status === "done" && Array.isArray(job.result)) setResults(job.result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobKey]);

  // Geçmiş üretimler
  const logsKey = ["idea-generation-logs", companyId];
  const { data: logs = [] } = useQuery({
    queryKey: logsKey,
    queryFn: () => companyId
      ? base44.entities.IdeaGenerationLog.filter({ company_id: companyId }, "-created_date", 20)
      : Promise.resolve([]),
    initialData: [],
    enabled: !!companyId,
  });

  const { data: specialDays = [] } = useQuery({
    queryKey: ["special-days"],
    queryFn: () => base44.entities.SpecialDay.list("name", 200),
    initialData: [],
  });
  const [specialDayId, setSpecialDayId] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["app-settings-mix"],
    queryFn: async () => { const l = await base44.entities.AppSettings.list(); return l?.[0] || {}; },
    initialData: {},
  });

  const togglePlatform = (p) => setPlatforms(arr => arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p]);

  const generate = () => {
    if (!companyId) { toast.error("Firma seç"); return; }
    if (mode === "specific" && !topic.trim()) { toast.error("Konu / brief yaz"); return; }
    setLoading(true);
    setResults([]);
    const workflowId = newWorkflowId();
    // State snapshot — sayfa geçince doğru değerlerle çalışsın
    const snap = { mode, topic, platforms: [...platforms], contentType, tone, languages: [...languages], count, specialDayId, generatorProvider, selectedModel };

    runJob(
      async () => {
      const { mode, topic, platforms, contentType, tone, languages, count, specialDayId, generatorProvider, selectedModel } = snap;
      const [recentTitles, { styleMemory, firmaBaglam }, pillarCheck] = await Promise.all([
        fetchRecentTitles(companyId, 10),
        loadCompanyContext(companyId, companies),
        checkContentPillarBalance(companyId),
      ]);

      await logAgentStep({
        workflow_id: workflowId,
        agent_role: "researcher",
        status: "completed",
        related_entity_type: "ContentIdea",
        company_id: companyId,
        output_data: { has_style_memory: !!styleMemory, has_firma_baglam: !!firmaBaglam, recent_count: recentTitles.length },
      });

      const systemPrompt = buildAISystemPrompt("mix", company, styleMemory, firmaBaglam);

      let modeContext = "";
      if (mode === "specific") modeContext = `Konu/Brief: ${topic}`;
      else if (mode === "general") modeContext = "Marka için en uygun konuları kendin belirle.";
      else if (mode === "special_day") {
        const sd = specialDays.find(s => s.id === specialDayId);
        modeContext = `Özel gün: ${sd?.name || "belirtilmedi"}. Bu güne özel içerik üret.`;
      }

      const recentBlock = recentTitles.length > 0
        ? `Son üretilen konular (TEKRARLAMA): ${recentTitles.join(", ")}`
        : "";

      const pillarHint = pillarCheck.suggestion
        ? `İçerik dengesi önerisi: "${pillarCheck.suggestion.recommendPillar}" kategorisine ağırlık ver.`
        : "";

      const isSingle = count === 1;
      const userPrompt = `${recentBlock}
${modeContext}
${pillarHint}

Platformlar: ${platforms.join(", ")}. İçerik türü: ${contentType}. Ton: ${tone}. Diller: ${languages.join(", ")}.
${count} adet içerik fikri üret.

Her fikir için şu JSON yapısını kullan (Türkçe). SADECE JSON döndür:
{
  "ideas": [
    {
      "title": "Çarpıcı başlık",
      "platform": "${platforms[0]}",
      "hook": "Scroll durdurucu açılış — psikolojik tetikleyici",
      "brief": "Detaylı senaryo: ne gösterilecek, nasıl çekilecek",
      "captions": {${languages.map(l => `"${l}": "${l} caption — emoji, CTA dahil"`).join(", ")}},
      "hashtags": {"ana": ["#1","#2","#3","#4","#5"], "trend": ["#1","#2","#3"], "nis": ["#1","#2"]},
      "content_pillar": "egit|eglendir|sat|guven",
      "suggested_time": "19:00",
      "format": "Neden bu format (1 cümle)",
      "tools": "Canva, Premiere, CapCut...",
      "gorsel_prompt": {
        "turkce": "Türkçe görsel açıklaması",
        "ingilizce": "Professional English image prompt — subject, angle, lighting, color, mood, composition. 3+ sentences.",
        "negative": "low quality, blurry, watermark, distorted",
        "tasarim_prompt": "Grafik tasarım: metin yerleşimi, tipografi, renk blokları"
      }
    }
  ]
}`;

      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "mix",
        system_prompt: systemPrompt,
        prompt: userPrompt,
        json_mode: true,
        skip_cache: true,
        provider_override: generatorProvider !== "auto" ? generatorProvider : undefined,
        model_override: selectedModel || undefined,
      });

      const aiData = res.data || res;
      if (aiData?.error) throw new Error(aiData.error);

      let parsed = extractJSON(aiData.result);
      if (!parsed?.ideas) {
        // Tek sonuçlu eski format uyumluluğu
        if (parsed?.icerik_fikri) {
          parsed = { ideas: [{
            title: parsed.icerik_fikri.baslik,
            brief: parsed.icerik_fikri.aciklama,
            hook: parsed.caption?.hook,
            captions: { TR: parsed.caption?.uzun || parsed.caption?.kisa },
            hashtags: parsed.hashtags,
            gorsel_prompt: parsed.gorsel_prompt,
            content_pillar: parsed.content_pillar,
            suggested_time: parsed.en_iyi_yayin_saati,
          }] };
        } else {
          const raw = (aiData.result || "").toString().trim();
          if (!raw) throw new Error(`AI boş yanıt döndü (model: ${aiData.model_used || "?"}). Ayarlar'dan farklı bir model deneyin.`);
          throw new Error(`AI yanıtı okunamadı (model: ${aiData.model_used || "?"}). Yanıt geçerli JSON değil. Daha az adet veya farklı model deneyin.`);
        }
      }

      const suggestedPillar = pillarCheck.suggestion?.recommendPillar;
      const ideas = (parsed.ideas || []).map(i => ({
        ...i,
        content_pillar: i.content_pillar || suggestedPillar || null,
        workflow_id: workflowId,
        platform: i.platform || platforms[0],
        // Pollinations URL
        _imageUrl: i.gorsel_prompt?.ingilizce && settings?.pollinations_enabled !== false
          ? pollinationsGorselUrl(i.gorsel_prompt.ingilizce)
          : null,
      }));

      setResults(ideas);

      await logAgentStep({
        workflow_id: workflowId,
        agent_role: "drafter",
        status: "completed",
        related_entity_type: "ContentIdea",
        company_id: companyId,
        output_data: { ideas_count: ideas.length },
        model_used: aiData.model_used,
      });

      // Log kaydet
      try {
        const created = await base44.entities.IdeaGenerationLog.create({
          company_id: companyId,
          company_name: company?.name,
          mode,
          topic: topic || "",
          platforms,
          content_type: contentType,
          tone,
          languages,
          ideas,
          ideas_count: ideas.length,
          model_used: aiData.model_used,
        });
        setActiveLogId(created.id);
        queryClient.invalidateQueries({ queryKey: logsKey });
      } catch (_) {}

      await runReviewerAutoApprove({ workflowId, idea: {}, company });

      return ideas;
      },
      {
        key: jobKey,
        title: "İçerik fikri üretiliyor",
        page: `${company?.name || "İçerik"} · ${snap.topic || snap.mode}`,
        href: "/ai-studio",
      },
      (err, ideas) => {
        setLoading(false);
        if (err) {
          toast.error("Üretim hatası: " + (err.message || ""));
        } else {
          setResults(ideas || []);
          toast.success(`${ideas?.length || 0} içerik paketi hazır 🎯`);
        }
      }
    );
  };

  const saveIdea = async (idea) => {
    try {
      const created = await base44.entities.ContentIdea.create({
        company_id: companyId,
        company_name: company?.name,
        title: idea.title,
        platform: idea.platform || platforms[0],
        topic: topic || idea.title,
        hook: idea.hook,
        generated_brief: idea.brief,
        caption: idea.captions?.TR || Object.values(idea.captions || {})[0] || "",
        hashtags: [...(idea.hashtags?.ana || []), ...(idea.hashtags?.trend || []), ...(idea.hashtags?.nis || [])],
        scheduled_date: new Date().toISOString().split("T")[0],
        work_status: "not_started",
        approval_mode: company?.default_approval_mode || "manual_internal",
        approval_status: company?.default_approval_mode === "none" ? "approved" : "pending_internal",
        content_pillar: idea.content_pillar || null,
        workflow_id: idea.workflow_id || null,
      });
      toast.success("Takvime eklendi ✓");

      // Arka plan auditor
      if (company) {
        runAuditor({ idea: { ...idea, id: created.id }, company, workflowId: idea.workflow_id })
          .then(async (audit) => {
            await base44.entities.ContentIdea.update(created.id, {
              audit_score: audit.score,
              audit_suggestions: audit.suggestions.join(" · ") || "",
            });
            setResults(prev => prev.map(r =>
              r === idea ? { ...r, audit_score: audit.score, audit_suggestions: audit.suggestions.join(" · ") } : r
            ));
            if (!audit.passed) toast.warning(`Auditor uyardı (skor ${audit.score}): ${audit.suggestions[0]}`);
            else toast.success(`Auditor: marka uyumu ${audit.score}/100`);
          }).catch(() => {});
      }

      // Log güncelle
      if (activeLogId) {
        const currentLog = logs.find(l => l.id === activeLogId);
        await base44.entities.IdeaGenerationLog.update(activeLogId, {
          saved_to_calendar_count: (currentLog?.saved_to_calendar_count || 0) + 1,
        });
        queryClient.invalidateQueries({ queryKey: logsKey });
      }
    } catch (e) {
      toast.error("Kaydedilemedi");
    }
  };

  const loadFromLog = (log) => {
    setResults(log.ideas || []);
    setActiveLogId(log.id);
    setTopic(log.topic || "");
    if (log.platforms?.length) setPlatforms(log.platforms);
    toast.success("Geçmişten yüklendi");
  };

  const deleteLog = async (id) => {
    if (!confirm("Bu üretim geçmişten silinecek")) return;
    await base44.entities.IdeaGenerationLog.delete(id);
    if (activeLogId === id) { setResults([]); setActiveLogId(null); }
    queryClient.invalidateQueries({ queryKey: logsKey });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Sol Panel: Ayarlar ─── */}
      <Card className="lg:col-span-1">
        <CardContent className="p-5 space-y-3">
          <div>
            <Label className="mb-1.5">Üretim Modu</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">Belirli Konu</SelectItem>
                <SelectItem value="general">Genel Fikir</SelectItem>
                <SelectItem value="special_day">Özel Gün</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "specific" && (
            <div>
              <Label className="mb-1.5">Konu / Brief</Label>
              <Textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ne hakkında üretmek istersin?" rows={2} />
            </div>
          )}

          {mode === "special_day" && (
            <Select value={specialDayId} onValueChange={setSpecialDayId}>
              <SelectTrigger><SelectValue placeholder="Özel gün seç..." /></SelectTrigger>
              <SelectContent>
                {specialDays.map(d => <SelectItem key={d.id} value={d.id}>{d.emoji} {d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <div>
            <Label className="mb-2 block">Platformlar</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.slice(0, 7).map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-2 py-1 text-xs rounded-md border transition-all ${
                    platforms.includes(p) ? "bg-gold text-slate-900 border-gold" : "bg-background hover:bg-muted"
                  }`}
                >{PLATFORM_LABELS[p]}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1.5 text-xs">Tür</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_GROUPS).map(([group, items]) => (
                    <React.Fragment key={group}>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{group}</div>
                      {items.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 text-xs">Ton</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Diller</Label>
            <div className="flex gap-1.5">
              {["TR", "NL", "FR", "EN"].map(l => (
                <button
                  key={l}
                  onClick={() => setLanguages(arr => arr.includes(l) ? arr.filter(x => x !== l) : [...arr, l])}
                  className={`px-2 py-1 text-xs rounded-md border ${
                    languages.includes(l) ? "bg-gold text-slate-900 border-gold" : "bg-background"
                  }`}
                >{l}</button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 text-xs">Adet: {count}</Label>
            <input type="range" min="1" max="5" value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="w-full" />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer">Tarz hafızası</Label>
              <Switch checked={useStyle} onCheckedChange={setUseStyle} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs cursor-pointer">Tekrar önleme</Label>
              <Switch checked={avoidRecent} onCheckedChange={setAvoidRecent} />
            </div>
          </div>

          <div className="pt-2 border-t space-y-2">
            <AIProviderSelector value={generatorProvider} onChange={setGeneratorProvider} />
            <div>
              <Label className="mb-1.5 text-xs">AI Model (opsiyonel)</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger><SelectValue placeholder="Otomatik" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Otomatik</SelectItem>
                  {MODEL_CATS_ORDER.map(cat => {
                    const items = OPENROUTER_MODELS.filter(m => m.cat === cat);
                    if (!items.length) return null;
                    return (
                      <React.Fragment key={cat}>
                        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{MODEL_CAT_LABELS[cat]}</div>
                        {items.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </React.Fragment>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={loading || !companyId}
            className="w-full text-white"
            style={{ backgroundColor: "#FF6B35", height: 48 }}
            size="lg"
          >
            {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Üretiliyor...</> : <><Rocket className="w-5 h-5 mr-2" /> Üret</>}
          </Button>
        </CardContent>
      </Card>

      {/* ─── Sağ Panel: Sonuçlar ─── */}
      <div className="lg:col-span-2 space-y-3">
        {pillarWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-amber-900">
              <p className="font-medium">İçerik Dengesi Önerisi</p>
              <p className="text-xs mt-0.5">{pillarWarning}</p>
            </div>
          </div>
        )}

        {/* Geçmiş */}
        {logs.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Geçmiş ({logs.length})</h3>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded border flex items-center justify-between gap-2 group cursor-pointer hover:bg-muted/60 ${activeLogId === log.id ? "bg-muted border-gold" : ""}`}
                    onClick={() => loadFromLog(log)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{log.topic || log.mode} • {log.ideas_count} fikir</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(log.platforms || []).join(", ")} • {format(new Date(log.created_date), "d MMM HH:mm", { locale: trLocale })}
                        {log.saved_to_calendar_count > 0 && ` • ${log.saved_to_calendar_count} takvime eklendi`}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive hover:text-destructive-foreground rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {results.length === 0 && !loading && (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Konu yaz ve "Üret" butonuna bas — fikir, caption, hashtag ve görsel prompt tek seferde.
            <p className="text-xs mt-2 opacity-60">Tüm üretimler kalıcı saklanır.</p>
          </CardContent></Card>
        )}

        {results.map((idea, idx) => (
          <MixResultCard
            key={idx}
            idea={idea}
            onSave={() => saveIdea(idea)}
            settings={settings}
            company={company}
          />
        ))}
      </div>
    </div>
  );
}