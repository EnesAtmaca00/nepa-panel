import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Repeat, Sparkles, Loader2, CheckCircle2, Play, SkipForward, RefreshCw } from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel, todayISO, addDays } from "@/lib/format";
import { toast } from "sonner";

const DAY_LABELS = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 7: "Pzr" };

function getNextDateForTemplate(tpl, fromDate) {
  const today = new Date(fromDate);
  if (tpl.frequency === "weekly" && tpl.day_of_week) {
    const targetWeekday = tpl.day_of_week === 7 ? 0 : tpl.day_of_week; // 7=Pzr -> 0
    const d = new Date(today);
    let daysAhead = (targetWeekday - d.getDay() + 7) % 7;
    if (daysAhead === 0) daysAhead = 7; // bir sonraki haftanın aynı günü
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  }
  if (tpl.frequency === "monthly" && tpl.day_of_month) {
    const d = new Date(today.getFullYear(), today.getMonth(), tpl.day_of_month);
    if (d <= today) d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  }
  return null;
}

export default function Recurring() {
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["recurring-templates"],
    queryFn: () => base44.entities.RecurringContentTemplate.list(),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const today = todayISO();
  const weekEnd = addDays(today, 14);

  const { data: instances = [] } = useQuery({
    queryKey: ["recurring-instances-all"],
    queryFn: () => base44.entities.RecurringContentInstance.list("-target_date", 300),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const upcoming = instances.filter(i => i.target_date >= today && i.target_date <= weekEnd)
    .sort((a, b) => a.target_date.localeCompare(b.target_date));
  const past = instances.filter(i => i.target_date < today)
    .sort((a, b) => b.target_date.localeCompare(a.target_date)).slice(0, 50);

  const seedTemplates = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke("seedAppData", {});
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      toast.success("Şablonlar yüklendi");
    } finally {
      setSeeding(false);
    }
  };

  const generateInstances = async () => {
    setGenerating(true);
    try {
      const created = [];
      const existingKeys = new Set(instances.map(i => `${i.template_id}-${i.company_id}-${i.target_date}`));
      for (const tpl of templates) {
        if (!tpl.active && tpl.active !== undefined) continue;
        const nextDate = getNextDateForTemplate(tpl, today);
        if (!nextDate) continue;
        for (const cid of tpl.subscribed_companies || []) {
          const company = companies.find(c => c.id === cid);
          if (!company || company.status !== "active") continue;
          const key = `${tpl.id}-${cid}-${nextDate}`;
          if (existingKeys.has(key)) continue;
          created.push({
            template_id: tpl.id,
            template_name: tpl.name,
            company_id: cid,
            company_name: company.name,
            target_date: nextDate,
            status: "pending",
          });
        }
      }
      if (created.length > 0) {
        await base44.entities.RecurringContentInstance.bulkCreate(created);
        toast.success(`${created.length} instans oluşturuldu`);
        queryClient.invalidateQueries({ queryKey: ["recurring-instances-all"] });
      } else {
        toast.info("Yeni instans yok, hepsi zaten oluşturulmuş.");
      }
    } catch (e) {
      toast.error("Oluşturulamadı: " + (e.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  const updateInstance = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RecurringContentInstance.update(id, {
      status,
      completed_at: status === "done" ? new Date().toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-instances-all"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tekrarlayan İçerikler</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {templates.length} şablon • {upcoming.length} yaklaşan instans
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button variant="outline" onClick={seedTemplates} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Hazır 4 Şablonu Yükle
            </Button>
          )}
          <Button onClick={generateInstances} disabled={generating || templates.length === 0}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sonraki Instansları Üret
          </Button>
        </div>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader><CardTitle className="text-base">Şablonlar</CardTitle></CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Şablon yok. Yukarıdan hazır şablonları yükleyebilirsin.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map(t => (
                <div key={t.id} className="p-4 rounded-lg border">
                  <div className="text-3xl mb-2">{t.emoji || "🔁"}</div>
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t.frequency === "weekly" ? `Her ${DAY_LABELS[t.day_of_week]}` : `Ayın ${t.day_of_month}'i`}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {t.subscribed_companies?.length || 0} abone
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instances */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Yaklaşan ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Geçmiş</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Yaklaşan instans yok. Yukarıdaki "Sonraki Instansları Üret" butonu ile oluşturabilirsin.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {upcoming.map(inst => (
                <Card key={inst.id}>
                  <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{inst.company_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {inst.template_name} • {formatDate(inst.target_date)}
                      </div>
                    </div>
                    <Badge className={getStatusColor(inst.status)}>{getStatusLabel(inst.status)}</Badge>
                    {inst.status !== "done" && inst.status !== "skipped" && (
                      <div className="flex gap-1">
                        {inst.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => updateInstance.mutate({ id: inst.id, status: "in_progress" })}>
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="sm" onClick={() => updateInstance.mutate({ id: inst.id, status: "done" })}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Tamamlandı
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateInstance.mutate({ id: inst.id, status: "skipped" })}>
                          <SkipForward className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {past.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Geçmiş kayıt yok.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {past.map(inst => (
                <Card key={inst.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{inst.company_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {inst.template_name} • {formatDate(inst.target_date)}
                      </div>
                    </div>
                    <Badge className={getStatusColor(inst.status)}>{getStatusLabel(inst.status)}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}