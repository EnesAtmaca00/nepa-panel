import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Languages, Copy } from "lucide-react";
import { toast } from "sonner";
import { newWorkflowId, logAgentStep, runAuditor } from "@/lib/aiEngineHelpers";
import { loadCompanyContext } from "@/lib/companyContext";
import AIProviderSelector from "./AIProviderSelector";
import AgentPipelineStatus from "./AgentPipelineStatus";
import { useJobs } from "@/lib/JobsContext";

const ALL_LANGS = [
  { code: "TR", label: "🇹🇷 Türkçe" },
  { code: "EN", label: "🇬🇧 İngilizce" },
  { code: "NL", label: "🇳🇱 Felemenkçe" },
  { code: "FR", label: "🇫🇷 Fransızca" },
  { code: "DE", label: "🇩🇪 Almanca" },
  { code: "AR", label: "🇸🇦 Arapça" },
];

export default function CaptionTranslator({ companyId, companies = [] }) {
  const [caption, setCaption] = useState("");
  const [sourceLang, setSourceLang] = useState("TR");
  const [targets, setTargets] = useState(["EN", "NL"]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatorProvider, setGeneratorProvider] = useState("auto");
  const [pipelineSteps, setPipelineSteps] = useState({});
  const { runJob, getJobByKey } = useJobs();
  const jobKey = `translate_${companyId || "genel"}`;

  const availableTargets = ALL_LANGS.filter(l => l.code !== sourceLang);

  // Mount/firma değişince: arka planda süren veya biten işi geri yükle
  useEffect(() => {
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

  const translate = () => {
    if (!caption.trim()) { toast.error("Caption yaz"); return; }
    if (targets.length === 0) { toast.error("Hedef dil seç"); return; }
    setLoading(true);
    setResult(null);
    setPipelineSteps({ researcher: "running" });
    const workflowId = newWorkflowId();
    const jobCaption = caption;
    const jobSource = sourceLang;
    const jobTargets = [...targets];
    const jobProvider = generatorProvider;

    runJob(
      async () => {
      // Researcher: firma bağlam
      let companyData = null;
      if (companyId) {
        const ctx = await loadCompanyContext(companyId, companies);
        companyData = ctx.company;
        await logAgentStep({
          workflow_id: workflowId,
          agent_role: "researcher",
          status: "completed",
          related_entity_type: "ContentIdea",
          company_id: companyId,
          output_data: { source_lang: jobSource, target_langs: jobTargets },
        });
      }
      setPipelineSteps({ researcher: "completed", drafter: "running" });

      // Drafter: çeviri
      const res = await base44.functions.invoke("translateCaption", {
        caption: jobCaption,
        source_language: jobSource,
        target_languages: jobTargets,
        company_id: companyId || undefined,
        generator_provider: jobProvider !== "auto" ? jobProvider : undefined,
      });
      const translations = res.data?.translations || {};
      setResult(translations);

      await logAgentStep({
        workflow_id: workflowId,
        agent_role: "drafter",
        status: "completed",
        related_entity_type: "ContentIdea",
        company_id: companyId,
        output_data: { languages_translated: Object.keys(translations).length },
        model_used: res.data?.model || "",
      });
      setPipelineSteps({ researcher: "completed", drafter: "completed", auditor: "running" });

      // Auditor: her çeviriyi marka uyumu açısından kontrol et
      if (companyData && Object.keys(translations).length > 0) {
        await Promise.all(
          Object.entries(translations).map(([lang, content]) =>
            runAuditor({
              idea: { title: `Çeviri (${lang})`, caption: content.caption || "" },
              company: companyData,
              workflowId,
            }).catch(() => {})
          )
        );
      }
      setPipelineSteps({ researcher: "completed", drafter: "completed", auditor: "completed" });

      return translations;
      },
      {
        key: jobKey,
        title: "Çeviri yapılıyor",
        page: `${companies.find(c => c.id === companyId)?.name || "Genel"} · ${jobTargets.join(", ")}`,
        href: "/ai-studio",
      },
      (err, result) => {
        setLoading(false);
        if (err) {
          toast.error("Hata: " + (err.message || ""));
          setPipelineSteps({});
        } else {
          setResult(result || {});
          toast.success("Çeviri hazır!");
        }
      }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label className="mb-2 block">Kaynak Dil</Label>
            <div className="flex gap-2 flex-wrap">
              {ALL_LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => {
                    setSourceLang(l.code);
                    setTargets(prev => prev.filter(t => t !== l.code));
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm border ${sourceLang === l.code ? "bg-gold text-slate-900 border-gold" : "bg-background"}`}
                >{l.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Caption</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={10} placeholder="Çevrilecek caption..." />
          </div>
          <div>
            <Label className="mb-2 block">Hedef Diller</Label>
            <div className="flex gap-2 flex-wrap">
              {availableTargets.map(l => (
                <button
                  key={l.code}
                  onClick={() => setTargets(arr => arr.includes(l.code) ? arr.filter(x => x !== l.code) : [...arr, l.code])}
                  className={`px-3 py-1.5 rounded-md text-sm border ${targets.includes(l.code) ? "bg-gold text-slate-900 border-gold" : "bg-background"}`}
                >{l.label}</button>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t">
            <AIProviderSelector value={generatorProvider} onChange={setGeneratorProvider} />
          </div>

          <Button onClick={translate} disabled={loading} className="w-full bg-gold text-slate-900 hover:bg-gold/90">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Çevriliyor...</> : <><Languages className="w-4 h-4 mr-2" /> Lokalize Et</>}
          </Button>
          {Object.keys(pipelineSteps).length > 0 && (
            <AgentPipelineStatus steps={pipelineSteps} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {!result ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <Languages className="w-12 h-12 mx-auto mb-3 opacity-30" />
            Caption'ı yaz, kaynak ve hedef dilleri seç, "Lokalize Et" butonuna bas.
          </CardContent></Card>
        ) : (
          Object.entries(result).map(([lang, content]) => (
            <Card key={lang}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gold">
                    {ALL_LANGS.find(l => l.code === lang)?.label || lang}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(content.caption); toast.success("Kopyalandı"); }}>
                    <Copy className="w-3 h-3 mr-1" /> Kopyala
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{content.caption}</p>
                {content.hashtags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {content.hashtags.map((h, i) => (
                      <span key={i} className="text-xs text-blue-600">{h.startsWith("#") ? h : `#${h}`}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}