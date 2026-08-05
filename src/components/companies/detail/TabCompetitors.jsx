import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, TrendingUp, AlertTriangle, Lightbulb, Loader2, Sparkles, Plus, X, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import CompetitorReportPDFButton from "./CompetitorReportPDFButton";
import CompetitorDashboard from "@/components/competitors/CompetitorDashboard";
import AgentPipelineStatus from "@/components/ai/AgentPipelineStatus";
import { useJobs } from "@/lib/JobsContext";

const severityColor = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const priorityColor = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-emerald-100 text-emerald-700",
};

export default function TabCompetitors({ company }) {
  const queryClient = useQueryClient();
  const { runJob } = useJobs();
  const [newCompetitor, setNewCompetitor] = useState("");
  const [pipelineSteps, setPipelineSteps] = useState({});
  const [analyzing, setAnalyzing] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["competitor-reports", company.id],
    queryFn: () => base44.entities.CompetitorReport.filter({ company_id: company.id }, "-created_date", 10),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
    refetchInterval: analyzing ? 8000 : false,
  });

  const competitors = company.competitor_handles || [];

  const updateCompanyMutation = useMutation({
    mutationFn: (newList) => base44.entities.Company.update(company.id, { competitor_handles: newList }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      setNewCompetitor("");
    },
  });

  // Rakip analizi — arka planda çalışır; sayfa değişse bile devam eder
  const startAnalysis = () => {
    setAnalyzing(true);
    setPipelineSteps({ researcher: "running" });
    const stepTimer = setTimeout(() => {
      setPipelineSteps({ researcher: "completed", drafter: "running" });
    }, 5000);

    runJob(
      async () => {
        const res = await base44.functions.invoke("analyzeCompetitors", { company_id: company.id });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data;
      },
      {
        title: "Rakip analizi yapılıyor",
        page: company.name,
        href: `/musteriler/${company.id}`,
      },
      (err) => {
        clearTimeout(stepTimer);
        setAnalyzing(false);
        queryClient.invalidateQueries({ queryKey: ["competitor-reports", company.id] });
        if (err) {
          toast.error("Analiz başarısız: " + err.message);
          setPipelineSteps({});
        } else {
          toast.success("Rakip analizi tamamlandı");
          setPipelineSteps({ researcher: "completed", drafter: "completed", auditor: "completed" });
          setTimeout(() => setPipelineSteps({}), 3000);
        }
      }
    );
    toast.info("Analiz arka planda başladı — başka sayfaya geçebilirsin");
  };

  const handleAddCompetitor = () => {
    const v = newCompetitor.trim();
    if (!v) return;
    updateCompanyMutation.mutate([...competitors, v]);
  };

  const handleRemoveCompetitor = (handle) => {
    updateCompanyMutation.mutate(competitors.filter((c) => c !== handle));
  };

  const latestReport = reports.find((r) => r.status === "completed");
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | details

  return (
    <div className="space-y-6">
      {/* Rakip yönetimi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="w-4 h-4 text-amber-600" /> Rakipler ({competitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Rakip handle / web / isim (örn: @rakipmarka veya rakip.com)"
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
            />
            <Button onClick={handleAddCompetitor} disabled={!newCompetitor.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {competitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz rakip eklenmemiş.</p>
            ) : (
              competitors.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1 pr-1 py-1">
                  {c}
                  <button
                    onClick={() => handleRemoveCompetitor(c)}
                    className="ml-1 hover:bg-slate-300 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              AI ajan pipeline'ı ile haftalık rakip analizi oluşturur. Web araştırması + stratejik rapor.
            </p>
            <div className="flex flex-col items-end gap-2">
              <Button
                onClick={startAnalysis}
                disabled={analyzing || competitors.length === 0}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {analyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analiz ediliyor...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Haftalık Rapor Oluştur</>
                )}
              </Button>
              {Object.keys(pipelineSteps).length > 0 && (
                <AgentPipelineStatus steps={pipelineSteps} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* En son rapor */}
      {latestReport && (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 border rounded-md p-1 w-fit">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("dashboard")}
              className="gap-1.5"
            >
              <BarChart2 className="w-3.5 h-3.5" /> Dashboard
            </Button>
            <Button
              variant={activeTab === "details" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("details")}
              className="gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5" /> Detaylar
            </Button>
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <CompetitorDashboard
              report={latestReport}
              company={company}
              onSendToCalendar={(post) => {
                const params = new URLSearchParams({
                  prefill: encodeURIComponent(JSON.stringify({
                    company_id: company.id,
                    company_name: company.name,
                    platform: post.platform ? `${post.platform}_post` : "instagram_post",
                    caption: post.caption_idea || "",
                    hashtags: post.hashtags || [],
                    notes: post.rationale || "",
                  }))
                });
                window.location.href = `/yayin-takvimi?${params}`;
              }}
            />
          )}

          {/* Details Tab */}
          {activeTab === "details" && <>
          {/* Özet */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-amber-700" /> Yönetici Özeti
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {latestReport.period_start} → {latestReport.period_end}
                  </Badge>
                  <CompetitorReportPDFButton report={latestReport} company={company} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {latestReport.executive_summary || "Özet bulunamadı."}
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Zayıf Yönler */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-red-700">
                  <AlertTriangle className="w-4 h-4" /> Zayıf Yönler ({(latestReport.weaknesses || []).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(latestReport.weaknesses || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tespit yok.</p>
                ) : (
                  latestReport.weaknesses.map((w, i) => (
                    <div key={i} className="border-l-2 border-red-300 pl-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{w.title}</h4>
                        <Badge className={`${severityColor[w.severity] || severityColor.medium} text-xs`}>
                          {w.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{w.description}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Fırsatlar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
                  <Lightbulb className="w-4 h-4" /> Fırsatlar ({(latestReport.opportunities || []).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(latestReport.opportunities || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Fırsat tespit edilmedi.</p>
                ) : (
                  latestReport.opportunities.map((o, i) => (
                    <div key={i} className="border-l-2 border-emerald-300 pl-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{o.title}</h4>
                        <Badge className={`${priorityColor[o.priority] || priorityColor.medium} text-xs`}>
                          {o.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
                      {o.action && (
                        <p className="text-xs mt-1 font-medium text-emerald-700">→ {o.action}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rakip detayları */}
          {(latestReport.competitors_analyzed || []).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Analiz Edilen Rakipler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestReport.competitors_analyzed.map((c, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-sm">{c.name || c.handle}</h4>
                      {c.platform && <Badge variant="outline" className="text-xs">{c.platform}</Badge>}
                    </div>
                    {c.summary && <p className="text-xs text-muted-foreground">{c.summary}</p>}
                    {c.recent_activity && (
                      <p className="text-xs mt-1"><span className="font-medium">Son hafta:</span> {c.recent_activity}</p>
                    )}
                    {c.strengths && c.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.strengths.map((s, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          </>}
        </>
      )}

      {/* Geçmiş raporlar */}
      {reports.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Geçmiş Raporlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.slice(1).map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded text-sm">
                <span>
                  {r.period_start} → {r.period_end}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{r.status}</Badge>
                  {r.status === "completed" && (
                    <CompetitorReportPDFButton report={r} company={company} compact />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && reports.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Henüz rapor yok. Yukarıdan rakip ekleyin ve "Haftalık Rapor Oluştur" deyin.
          </CardContent>
        </Card>
      )}
    </div>
  );
}