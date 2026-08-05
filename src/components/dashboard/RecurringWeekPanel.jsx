import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, CheckCircle2, Play, SkipForward } from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel, todayISO, addDays } from "@/lib/format";
import { toast } from "sonner";

export default function RecurringWeekPanel() {
  const queryClient = useQueryClient();
  const today = todayISO();
  const weekEnd = addDays(today, 7);

  const { data: instances = [] } = useQuery({
    queryKey: ["recurring-week"],
    queryFn: () => base44.entities.RecurringContentInstance.filter(
      { target_date: { $gte: today, $lte: weekEnd } },
      "target_date",
      50
    ),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RecurringContentInstance.update(id, {
      status,
      completed_at: status === "done" ? new Date().toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-week"] });
      toast.success("Durum güncellendi");
    },
  });

  if (instances.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="w-4 h-4 text-gold" />
            Bu Hafta Tekrarlayan İçerikler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            Bu hafta için planlanmış tekrarlayan içerik yok. Müşteri kayıt formundan abonelikleri ayarlayabilirsin.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="w-4 h-4 text-gold" />
          Bu Hafta Tekrarlayan İçerikler ({instances.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{inst.company_name}</span>
                  <Badge variant="outline" className="text-xs">{inst.template_name}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Hedef tarih: {formatDate(inst.target_date)}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor(inst.status)}>{getStatusLabel(inst.status)}</Badge>
                {inst.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: inst.id, status: "in_progress" })}>
                    <Play className="w-3 h-3 mr-1" /> Başla
                  </Button>
                )}
                {inst.status !== "done" && inst.status !== "skipped" && (
                  <>
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: inst.id, status: "done" })}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Tamamlandı
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: inst.id, status: "skipped" })}>
                      <SkipForward className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}