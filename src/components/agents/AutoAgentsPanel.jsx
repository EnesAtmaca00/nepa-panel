// SORUN 3: Enricher, Analyst, Anomali Dedektörü — otomatik ajanlar (HITL yok)
// /ajanlar sayfasında ana ajan kartlarının altında gösterilir.
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, BarChart3, AlertOctagon, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

const AUTO_AGENTS = [
  {
    key: "enricher",
    name: "🔍 Enricher (Zenginleştirici)",
    icon: Search,
    color: "bg-blue-500",
    bg: "bg-blue-50/60 border-blue-200",
    desc: "Yeni firma eklenince otomatik devreye girer. Web sitesini okur, marka kelimelerini ve hedef kitleyi doldurur.",
    trigger: "Firma oluşturulunca otomatik / Manuel buton",
    hitl: false,
  },
  {
    key: "analyst",
    name: "📊 Analyst (Analist)",
    icon: BarChart3,
    color: "bg-purple-500",
    bg: "bg-purple-50/60 border-purple-200",
    desc: "Sektör bazlı başarı oranlarını hesaplar. Hangi platform, format ve içerik türü daha çok onay alıyor?",
    trigger: "Haftalık otomatik / Manuel buton",
    hitl: false,
  },
  {
    key: "anomaly",
    name: "🚨 Anomali Dedektörü",
    icon: AlertOctagon,
    color: "bg-rose-500",
    bg: "bg-rose-50/60 border-rose-200",
    desc: "Dashboard açılınca çalışır. İçerik boşluklarını, vadesi geçmiş faturaları ve sözleşme bitişlerini tespit eder.",
    trigger: "Otomatik (dashboard her açılışında)",
    hitl: false,
  },
];

export default function AutoAgentsPanel() {
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [analystLoading, setAnalystLoading] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });

  const { data: settings = {} } = useQuery({
    queryKey: ["app-settings-auto-agents"],
    queryFn: async () => (await base44.entities.AppSettings.list())?.[0] || {},
    initialData: {},
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  // Tüm firmaları zenginleştir
  const runEnricherAll = async () => {
    if (enrichLoading) return;
    setEnrichLoading(true);
    try {
      const { enricherAjan } = await import("@/lib/enricherAgent");
      const companies = await base44.entities.Company.filter({ deleted: false, status: "active" }, "name", 200);
      setEnrichProgress({ done: 0, total: companies.length });
      for (let i = 0; i < companies.length; i++) {
        try {
          await enricherAjan(companies[i]);
        } catch (e) {
          console.warn(`Enricher hata (${companies[i].name}):`, e?.message);
        }
        setEnrichProgress({ done: i + 1, total: companies.length });
      }
      toast.success(`${companies.length} firma zenginleştirildi`);
    } catch (e) {
      toast.error("Zenginleştirme hatası: " + e.message);
    } finally {
      setEnrichLoading(false);
      setEnrichProgress({ done: 0, total: 0 });
    }
  };

  // Analizi şimdi çalıştır
  const runAnalystNow = async () => {
    if (analystLoading) return;
    setAnalystLoading(true);
    try {
      const { analystAjan } = await import("@/lib/analystAgent");
      const result = await analystAjan();
      toast.success(`Analiz tamamlandı — ${result?.sektor_sayisi || 0} sektör güncellendi`);
    } catch (e) {
      toast.error("Analiz hatası: " + e.message);
    } finally {
      setAnalystLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Otomatik Ajanlar</h2>
        <Badge variant="outline" className="text-[10px]">HITL YOK · Otomatik çalışır</Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Bu ajanlar onay beklemeden çalışır — yalnızca veri okur ve yazar, kullanıcıya mesaj göndermez.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {AUTO_AGENTS.map(agent => {
          const Icon = agent.icon;
          return (
            <Card key={agent.key} className={`border-2 ${agent.bg}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${agent.color} text-white flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{agent.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{agent.trigger}</div>
                  </div>
                </div>
                <p className="text-xs text-foreground/80">{agent.desc}</p>

                {agent.key === "enricher" && (
                  <Button
                    size="sm"
                    onClick={runEnricherAll}
                    disabled={enrichLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {enrichLoading ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        {enrichProgress.total > 0 ? `${enrichProgress.done}/${enrichProgress.total}` : "Çalışıyor..."}
                      </>
                    ) : (
                      <><Play className="w-3 h-3 mr-1" /> Tüm Firmaları Zenginleştir</>
                    )}
                  </Button>
                )}

                {agent.key === "analyst" && (
                  <Button
                    size="sm"
                    onClick={runAnalystNow}
                    disabled={analystLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {analystLoading ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analiz ediliyor...</>
                    ) : (
                      <><Play className="w-3 h-3 mr-1" /> Analizi Şimdi Çalıştır</>
                    )}
                  </Button>
                )}

                {agent.key === "anomaly" && (
                  <div className="text-[10px] text-muted-foreground bg-white/60 rounded p-2 border">
                    Dashboard her açıldığında otomatik çalışır.
                    {settings.proactive_alerts_enabled === false && (
                      <span className="block mt-1 text-amber-700">⚠ Şu an pasif (Ayarlar'dan açabilirsiniz)</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}