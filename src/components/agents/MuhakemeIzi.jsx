import React, { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Search, FileText, ShieldCheck, CheckCircle2, Loader2, Inbox, BarChart3, AlertOctagon, Bot } from "lucide-react";
import { toast } from "sonner";

const ROLE_META = {
  researcher:  { label: "Araştırmacı", icon: Search,        color: "bg-blue-100 text-blue-700 border-blue-200" },
  drafter:     { label: "Taslaklayıcı", icon: FileText,      color: "bg-purple-100 text-purple-700 border-purple-200" },
  auditor:     { label: "Denetçi",      icon: ShieldCheck,   color: "bg-amber-100 text-amber-700 border-amber-200" },
  enricher:    { label: "Enricher",     icon: Search,        color: "bg-sky-100 text-sky-700 border-sky-200" },
  analyst:     { label: "Analyst",      icon: BarChart3,     color: "bg-violet-100 text-violet-700 border-violet-200" },
  anomaly:     { label: "Anomali",      icon: AlertOctagon,  color: "bg-rose-100 text-rose-700 border-rose-200" },
};

const STATUS_META = {
  running:      { label: "Çalışıyor",   className: "bg-yellow-100 text-yellow-700" },
  completed:    { label: "Tamamlandı", className: "bg-emerald-100 text-emerald-700" },
  waiting_hitl: { label: "Onay Bekliyor", className: "bg-orange-100 text-orange-700 ring-2 ring-orange-300" },
  failed:       { label: "Başarısız",   className: "bg-rose-100 text-rose-700" },
  skipped:      { label: "Atlandı",     className: "bg-gray-100 text-gray-500" },
};

export default function MuhakemeIzi() {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["agent-workflow-logs"],
    queryFn: () => base44.entities.AgentWorkflowLog.list("-created_date", 100),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-min"],
    queryFn: () => base44.entities.Company.list("name", 500),
    initialData: [],
  });

  const companyMap = useMemo(() => {
    const m = {};
    companies.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [companies]);

  // workflow_id bazında grupla, en yeni en üstte
  const grouped = useMemo(() => {
    const g = {};
    logs.forEach(log => {
      const wid = log.workflow_id || "untagged";
      if (!g[wid]) g[wid] = [];
      g[wid].push(log);
    });
    // her grup içinde started_at'a göre artan sırala
    Object.values(g).forEach(arr => arr.sort((a, b) => {
      const ta = new Date(a.started_at || a.created_date).getTime();
      const tb = new Date(b.started_at || b.created_date).getTime();
      return ta - tb;
    }));
    // grupları en yeni adıma göre sırala
    return Object.entries(g).sort(([, a], [, b]) => {
      const la = new Date(a[a.length - 1].created_date).getTime();
      const lb = new Date(b[b.length - 1].created_date).getTime();
      return lb - la;
    });
  }, [logs]);

  const approveHITL = useMutation({
    mutationFn: async (log) => {
      await base44.entities.AgentWorkflowLog.update(log.id, {
        status: "completed",
        hitl_resolved_at: new Date().toISOString(),
      });
      if (log.related_entity_type === "ContentIdea" && log.related_entity_id) {
        try {
          await base44.entities.ContentIdea.update(log.related_entity_id, {
            approval_status: "approved",
          });
        } catch (_e) {}
      }
    },
    onSuccess: () => {
      toast.success("Onaylandı");
      queryClient.invalidateQueries({ queryKey: ["agent-workflow-logs"] });
      queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
    },
    onError: (e) => toast.error("Onay hatası: " + (e?.message || "")),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (grouped.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Henüz hiçbir ajan iş akışı kaydı yok.</p>
          <p className="text-xs mt-1 opacity-70">İçerik üretimi yapıldığında burada görünecek.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(([wid, steps]) => {
        const firstStep = steps[0];
        const lastStep = steps[steps.length - 1];
        const companyName = firstStep.company_id ? (companyMap[firstStep.company_id] || "—") : "—";
        const entityType = firstStep.related_entity_type || "—";

        return (
          <Card key={wid} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/40 border-b">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <code className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border">
                    {wid.substring(0, 12)}
                  </code>
                  <span className="text-xs font-medium truncate">{companyName}</span>
                  <Badge variant="outline" className="text-[10px]">{entityType}</Badge>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {format(new Date(lastStep.created_date), "d MMM HH:mm", { locale: tr })}
                </span>
              </div>

              {/* Steps */}
              <div className="divide-y">
                {steps.map(step => {
                  const role = ROLE_META[step.agent_role] || { label: step.agent_role, icon: Bot, color: "bg-gray-100 text-gray-700 border-gray-200" };
                  const status = STATUS_META[step.status] || STATUS_META.running;
                  const Icon = role.icon;
                  const confidence = step.confidence_score != null
                    ? Math.round(step.confidence_score * 100)
                    : null;
                  const isHITL = step.status === "waiting_hitl";

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 px-4 py-2.5 ${isHITL ? "bg-orange-50/60" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-md ${role.color} border flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold">{role.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.className}`}>
                            {status.label}
                          </span>
                          {confidence != null && (
                            <span className="text-[10px] text-muted-foreground">
                              güven %{confidence}
                            </span>
                          )}
                        </div>
                        {step.model_used && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {step.model_used}
                          </p>
                        )}
                        {step.output_data?.suggestions?.length > 0 && (
                          <p className="text-[10px] text-amber-700 mt-0.5 line-clamp-2">
                            💡 {step.output_data.suggestions.slice(0, 2).join(" · ")}
                          </p>
                        )}
                      </div>

                      {isHITL && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-orange-500 hover:bg-orange-600 text-white h-7 px-2 text-xs"
                          disabled={approveHITL.isPending}
                          onClick={() => approveHITL.mutate(step)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Onayla
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}