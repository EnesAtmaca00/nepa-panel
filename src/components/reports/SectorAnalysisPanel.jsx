// KATMAN 4B/5: Sektör Analizi paneli — Analyst Ajan ile çapraz firma öğrenme
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Sparkles, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { analystAjan } from "@/lib/analystAgent";
import { useJobs } from "@/lib/JobsContext";

const PILLAR_LABEL = { egit: "Eğit", eglendir: "Eğlendir", sat: "Sat", guven: "Güven" };

export default function SectorAnalysisPanel() {
  const queryClient = useQueryClient();
  const { runJob, getJobByKey } = useJobs();
  const jobKey = "sektor_analizi";
  const [running, setRunning] = useState(() => getJobByKey(jobKey)?.status === "running");

  const { data: analizler = [] } = useQuery({
    queryKey: ["sektor-analizleri"],
    queryFn: () => base44.entities.SektorAnalizi.list("-son_analiz_tarihi", 50),
    initialData: [],
  });

  const handleRun = () => {
    setRunning(true);
    runJob(
      () => analystAjan(),
      { key: jobKey, title: "Sektör analizi çalışıyor", page: "Çapraz firma öğrenme", href: "/raporlar" },
      (err, sonuclar) => {
        setRunning(false);
        if (err) {
          toast.error("Analiz hatası: " + err.message);
        } else {
          toast.success(`${sonuclar?.length || 0} sektör analiz edildi`);
          queryClient.invalidateQueries({ queryKey: ["sektor-analizleri"] });
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Çapraz Firma Sektör Analizi</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tüm firmaların içeriklerini analiz eder, sektör bazında en başarılı platform/format çıkarır ve içerik üretiminde kullanır.
              </p>
            </div>
          </div>
          <Button onClick={handleRun} disabled={running}>
            {running ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analiz Çalışıyor...</>
            ) : (
              <><BarChart3 className="w-4 h-4 mr-2" /> Analizi Çalıştır</>
            )}
          </Button>
        </CardContent>
      </Card>

      {analizler.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Henüz sektör analizi yok. "Analizi Çalıştır" butonuna bas.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {analizler.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{a.sektor}</h3>
                <Badge variant="outline" className="text-[10px]">
                  {a.firma_sayisi} firma · {a.icerik_sayisi} içerik
                </Badge>
              </div>

              {a.en_basarili_platform && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <span className="font-medium">En başarılı:</span>
                  <Badge variant="secondary" className="text-[10px]">{a.en_basarili_platform}</Badge>
                </div>
              )}

              {a.ortalama_audit_skoru > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Ortalama kalite: </span>
                  <span className="font-medium">{a.ortalama_audit_skoru}/100</span>
                </div>
              )}

              {a.pillar_dagilimi && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {Object.entries(a.pillar_dagilimi).map(([p, sayi]) => (
                    <Badge key={p} variant={sayi > 0 ? "secondary" : "outline"} className="text-[10px]">
                      {PILLAR_LABEL[p] || p}: {sayi}
                    </Badge>
                  ))}
                </div>
              )}

              {a.son_analiz_tarihi && (
                <div className="text-[10px] text-muted-foreground pt-1 border-t">
                  Son analiz: {new Date(a.son_analiz_tarihi).toLocaleDateString("tr-TR")}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}