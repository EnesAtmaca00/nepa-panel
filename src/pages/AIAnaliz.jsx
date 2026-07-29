import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useJobs } from "@/lib/JobsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Loader2, RefreshCw, Target, Users, Lightbulb,
  ArrowUpRight, ArrowDownRight, Zap, BarChart3
} from "lucide-react";
import { toast } from "sonner";

const TREND_ICONS = {
  positive: <TrendingUp className="w-4 h-4 text-green-500" />,
  negative: <TrendingDown className="w-4 h-4 text-destructive" />,
  neutral: <Minus className="w-4 h-4 text-muted-foreground" />,
};

const IMPACT_COLORS = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const HEALTH_CONFIG = {
  good: { color: "text-green-600", bg: "bg-green-50 border-green-200", icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: "İyi" },
  warning: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, label: "Dikkat" },
  critical: { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: <AlertTriangle className="w-4 h-4 text-red-500" />, label: "Kritik" },
};

const CATEGORY_LABELS = {
  content: "İçerik",
  revenue: "Gelir",
  operations: "Operasyon",
  client_relations: "Müşteri İlişkileri",
};

const EFFORT_COLORS = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-purple-100 text-purple-700",
};

function ScoreRing({ score }) {
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

export default function AIAnaliz() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const { runJob, getJobByKey } = useJobs();
  const jobKey = "analyze_clients";

  // Mount: arka planda süren/biten analizi geri yükle
  useEffect(() => {
    const job = getJobByKey(jobKey);
    if (!job) return;
    if (job.status === "running") {
      setLoading(true);
    } else if (job.status === "done" && job.result) {
      setAnalysis(job.result.analysis);
      setMeta(job.result.meta);
    } else if (job.status === "error") {
      setError(job.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = () => {
    setLoading(true);
    setError(null);
    runJob(
      async () => {
        const res = await base44.functions.invoke("analyzeClients", {});
        if (res.data?.error) throw new Error(res.data.error);
        return {
          analysis: res.data.analysis,
          meta: { model_used: res.data.model_used, provider: res.data.provider, companies_analyzed: res.data.companies_analyzed },
        };
      },
      { key: jobKey, title: "AI müşteri analizi", page: "Tüm müşteriler", href: "/ai-analiz" },
      (err, result) => {
        setLoading(false);
        if (err) {
          setError(err.message);
          toast.error("Analiz başarısız: " + err.message);
        } else {
          setAnalysis(result.analysis);
          setMeta(result.meta);
          toast.success("Analiz tamamlandı");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-accent" />
            AI Analiz Paneli
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tüm müşterilerinizin performans analizi ve stratejik öneriler
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="bg-accent text-white hover:bg-accent/90 gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analiz ediliyor..." : analysis ? "Yeniden Analiz Et" : "Analizi Başlat"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-destructive">Analiz başarısız</div>
              <div className="text-xs text-muted-foreground mt-0.5">{error}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!analysis && !loading && !error && (
        <Card>
          <CardContent className="py-20 text-center space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-medium">AI Analizi Hazır</p>
              <p className="text-sm text-muted-foreground mt-1">
                "Analizi Başlat" butonuna tıklayarak tüm müşterileriniz için kapsamlı performans analizi ve stratejik öneriler alın.
              </p>
            </div>
            <Button onClick={runAnalysis} className="bg-accent text-white hover:bg-accent/90">
              <Zap className="w-4 h-4 mr-2" /> Analizi Başlat
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="skeleton h-24 rounded-lg" /></CardContent></Card>
          ))}
        </div>
      )}

      {analysis && (
        <>
          {/* Meta + Genel Skor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" /> Genel Durum Özeti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.executive_summary}</p>
                {meta && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Badge variant="outline" className="text-xs">{meta.companies_analyzed} müşteri analiz edildi</Badge>
                    <Badge variant="outline" className="text-xs font-mono">{meta.model_used}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center gap-2">
                <div className="text-sm font-medium text-muted-foreground">Genel Skor</div>
                <ScoreRing score={analysis.overall_score || 0} />
              </CardContent>
            </Card>
          </div>

          {/* Trendler */}
          {analysis.trends?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" /> Tespit Edilen Trendler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysis.trends.map((trend, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-1.5">
                      <div className="flex items-center gap-2">
                        {TREND_ICONS[trend.type]}
                        <span className="font-medium text-sm">{trend.title}</span>
                        <Badge variant="outline" className={`ml-auto text-[10px] ${IMPACT_COLORS[trend.impact]}`}>
                          {trend.impact === "high" ? "Yüksek" : trend.impact === "medium" ? "Orta" : "Düşük"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{trend.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bu Hafta Öncelikleri */}
          {analysis.weekly_priorities?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Bu Hafta Öncelikler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.weekly_priorities.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white ${
                      p.priority === "high" ? "bg-destructive" : p.priority === "medium" ? "bg-amber-500" : "bg-green-500"
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{p.title}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      {p.affected_clients?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.affected_clients.map((c, ci) => (
                            <Badge key={ci} variant="secondary" className="text-[10px]">{c}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Müşteri Sağlık Durumu */}
          {analysis.client_insights?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" /> Müşteri Performans Analizi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysis.client_insights.map((c, i) => {
                    const cfg = HEALTH_CONFIG[c.status] || HEALTH_CONFIG.warning;
                    return (
                      <div key={i} className={`p-4 rounded-lg border ${cfg.bg} space-y-2`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {cfg.icon}
                            <span className="font-semibold text-sm truncate">{c.company_name}</span>
                          </div>
                          <div className={`text-sm font-bold ${cfg.color}`}>{c.health_score}</div>
                        </div>
                        <p className="text-xs font-medium">{c.key_issue}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{c.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stratejik Öneriler */}
          {analysis.strategic_recommendations?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-accent" /> Stratejik Öneriler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.strategic_recommendations.map((rec, i) => (
                  <div key={i} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="font-semibold text-sm">{rec.title}</div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[rec.category] || rec.category}</Badge>
                        <Badge className={`text-[10px] ${EFFORT_COLORS[rec.effort]}`}>
                          {rec.effort === "low" ? "Kolay" : rec.effort === "medium" ? "Orta Çaba" : "Yüksek Çaba"}
                        </Badge>
                        <Badge className={`text-[10px] ${IMPACT_COLORS[rec.impact]}`}>
                          {rec.impact === "high" ? "Yüksek Etki" : rec.impact === "medium" ? "Orta Etki" : "Düşük Etki"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Riskler */}
          {analysis.risks?.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Tespit Edilen Riskler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.risks.map((risk, i) => (
                  <div key={i} className={`p-3 rounded-lg border flex items-start gap-3 ${
                    risk.severity === "high" ? "border-destructive/30 bg-destructive/5" :
                    risk.severity === "medium" ? "border-amber-200 bg-amber-50" : "border-border"
                  }`}>
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      risk.severity === "high" ? "text-destructive" :
                      risk.severity === "medium" ? "text-amber-500" : "text-muted-foreground"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{risk.title}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">{risk.description}</p>
                      {risk.affected_clients?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {risk.affected_clients.map((c, ci) => (
                            <Badge key={ci} variant="secondary" className="text-[10px]">{c}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}