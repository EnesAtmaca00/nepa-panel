import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, CheckCircle2, Clock, AlertCircle, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { tr as trLocale } from "date-fns/locale";
import { toast } from "sonner";

const ROLE_STYLE = {
  researcher: { color: "bg-blue-500", label: "Araştırmacı" },
  drafter: { color: "bg-purple-500", label: "Taslaklayıcı" },
  auditor: { color: "bg-amber-500", label: "Denetçi" },
  reviewer: { color: "bg-orange-500", label: "İnceleyici" },
  distributor: { color: "bg-emerald-500", label: "Dağıtıcı" },
  router: { color: "bg-slate-500", label: "Yönlendirici" },
  escalator: { color: "bg-rose-500", label: "Yükseltici" },
};

const STATUS_STYLE = {
  pending: { icon: Clock, color: "text-slate-400", bg: "bg-slate-100", label: "Bekliyor" },
  running: { icon: Loader2, color: "text-blue-500 animate-spin", bg: "bg-blue-50", label: "Çalışıyor" },
  completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Tamamlandı" },
  waiting_hitl: { icon: Eye, color: "text-orange-500", bg: "bg-orange-50", label: "İnsan Onayı Bekleniyor" },
  failed: { icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50", label: "Hata" },
  skipped: { icon: Clock, color: "text-slate-400", bg: "bg-slate-50", label: "Atlandı" },
};

export default function ReasoningTrace() {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["agent-workflow-logs"],
    queryFn: () => base44.entities.AgentWorkflowLog.list("-created_date", 100),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const approveHITL = useMutation({
    mutationFn: async (log) => {
      await base44.entities.AgentWorkflowLog.update(log.id, {
        status: "completed",
        hitl_resolved_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      // İlgili içerik onayı da çek
      if (log.related_entity_type === "content_idea" && log.related_entity_id) {
        try {
          await base44.entities.ContentIdea.update(log.related_entity_id, { approval_status: "approved" });
        } catch (e) {}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-workflow-logs"] });
      toast.success("Onaylandı");
    },
    onError: (e) => toast.error("Onay başarısız: " + e.message),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // workflow_id bazında grupla
  const grouped = logs.reduce((acc, log) => {
    const wid = log.workflow_id || "unknown";
    if (!acc[wid]) acc[wid] = [];
    acc[wid].push(log);
    return acc;
  }, {});

  // Her grubun ilk log tarihine göre sırala (en yeni üstte)
  const sortedWorkflows = Object.entries(grouped).sort((a, b) => {
    const aTime = new Date(a[1][0]?.created_date || 0).getTime();
    const bTime = new Date(b[1][0]?.created_date || 0).getTime();
    return bTime - aTime;
  });

  if (sortedWorkflows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Muhakeme İzi
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground text-sm">
          Henüz ajan iş akışı kaydı yok.
          <p className="text-xs mt-1 opacity-70">AI içerik üretildikçe burada görünecek.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="w-4 h-4" /> Muhakeme İzi ({sortedWorkflows.length} iş akışı)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedWorkflows.slice(0, 20).map(([wid, steps]) => {
          const sorted = [...steps].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          const taskType = sorted[0]?.related_entity_type || "—";
          const hasHITL = sorted.some(s => s.status === "waiting_hitl");
          const startDate = sorted[0]?.created_date;

          return (
            <div key={wid} className={`border rounded-lg p-3 ${hasHITL ? "border-orange-300 bg-orange-50/30" : "border-border"}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">{wid}</div>
                  <div className="text-sm font-medium">{taskType}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {startDate && format(new Date(startDate), "d MMM HH:mm", { locale: trLocale })}
                </div>
              </div>

              <div className="space-y-1.5">
                {sorted.map(step => {
                  const role = ROLE_STYLE[step.agent_role] || { color: "bg-slate-500", label: step.agent_role };
                  const status = STATUS_STYLE[step.status] || STATUS_STYLE.completed;
                  const StatusIcon = status.icon;
                  return (
                    <div key={step.id} className={`flex items-center gap-2 p-2 rounded ${status.bg}`}>
                      <div className={`w-6 h-6 rounded-full ${role.color} flex-shrink-0`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{role.label}</span>
                          <Badge variant="outline" className="text-[9px] px-1">
                            <StatusIcon className={`w-3 h-3 mr-0.5 ${status.color}`} />
                            {status.label}
                          </Badge>
                          {step.confidence_score != null && (
                            <span className="text-[10px] text-muted-foreground">
                              %{Math.round(step.confidence_score * 100)} güven
                            </span>
                          )}
                          {step.model_used && (
                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
                              {step.model_used}
                            </span>
                          )}
                        </div>
                      </div>
                      {step.status === "waiting_hitl" && (
                        <Button
                          size="sm"
                          onClick={() => approveHITL.mutate(step)}
                          disabled={approveHITL.isPending}
                          className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          ✅ Onayla
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}