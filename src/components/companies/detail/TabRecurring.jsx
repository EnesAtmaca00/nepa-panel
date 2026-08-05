import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Repeat, CheckCircle2 } from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/format";
import { toast } from "sonner";

const DAY_LABELS = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 7: "Pzr" };

export default function TabRecurring({ company }) {
  const queryClient = useQueryClient();
  // Optimistic local state: hangi template'lere abone olduğunu tut
  const [localSubs, setLocalSubs] = useState(null); // null = henüz yüklenmedi, sonra template id -> bool map

  const { data: templates = [] } = useQuery({
    queryKey: ["recurring-templates"],
    queryFn: () => base44.entities.RecurringContentTemplate.list(),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
    onSuccess: (data) => {
      // İlk yüklemede local state'i ayarla
      if (localSubs === null) {
        const map = {};
        data.forEach(t => {
          map[t.id] = (t.subscribed_companies || []).includes(company.id);
        });
        setLocalSubs(map);
      }
    },
  });

  // localSubs null ise templates'ten hesapla
  const getSubscribed = (tpl) => {
    if (localSubs !== null && localSubs[tpl.id] !== undefined) return localSubs[tpl.id];
    return (tpl.subscribed_companies || []).includes(company.id);
  };

  const { data: instances = [] } = useQuery({
    queryKey: ["recurring-instances", company.id],
    queryFn: () => base44.entities.RecurringContentInstance.filter({ company_id: company.id }, "-target_date", 50),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const toggleSubscription = useMutation({
    mutationFn: async ({ tplId, checked }) => {
      return base44.functions.invoke("toggleRecurringSubscription", {
        template_id: tplId,
        company_id: company.id,
        subscribed: checked,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-instances", company.id] });
      toast.success("Abonelik güncellendi");
    },
    onError: (err, vars) => {
      // Hata durumunda optimistic update'i geri al
      setLocalSubs(prev => ({ ...prev, [vars.tplId]: !vars.checked }));
      toast.error("Hata: " + (err.message || "Abonelik güncellenemedi"));
    },
  });

  const handleToggle = (tpl, checked) => {
    // Optimistic update — anında göster
    setLocalSubs(prev => ({ ...(prev || {}), [tpl.id]: checked }));
    toggleSubscription.mutate({ tplId: tpl.id, checked });
  };

  const updateInstance = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RecurringContentInstance.update(id, {
      status,
      completed_at: status === "done" ? new Date().toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-instances", company.id] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Şablon Abonelikleri</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Şablon yok. <a href="/tekrarlayanlar" className="text-accent hover:underline">Tekrarlayanlar</a> sayfasından şablon ekleyebilirsin.
            </div>
          ) : templates.map(t => {
            const subscribed = getSubscribed(t);
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <span className="text-2xl">{t.emoji || "🔁"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.frequency === "weekly"
                      ? `Her ${DAY_LABELS[t.day_of_week] || "?"}`
                      : t.frequency === "monthly"
                      ? `Ayın ${t.day_of_month || "?"}'i`
                      : "Özel"}
                  </div>
                </div>
                <Switch
                  checked={subscribed}
                  onCheckedChange={(checked) => handleToggle(t, checked)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Yaklaşan & Geçmiş İnstanslar</CardTitle></CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Henüz instans oluşturulmadı. Tekrarlayanlar sayfasından üretebilirsin.</div>
          ) : (
            <div className="space-y-2">
              {instances.map(inst => (
                <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{inst.template_name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(inst.target_date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(inst.status)}>{getStatusLabel(inst.status)}</Badge>
                    {inst.status !== "done" && inst.status !== "skipped" && (
                      <Button size="sm" onClick={() => updateInstance.mutate({ id: inst.id, status: "done" })}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Tamamlandı
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}