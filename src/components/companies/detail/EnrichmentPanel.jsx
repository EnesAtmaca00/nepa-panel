// KATMAN 9: Müşteri sayfası — Enricher butonu + Firma Analizi paneli
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, BarChart3, Sparkles, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { enricherAjan } from "@/lib/enricherAgent";

const PILLAR_LABEL = { egit: "📚 Eğit", eglendir: "🎭 Eğlendir", sat: "💰 Sat", guven: "🤝 Güven" };

export default function EnrichmentPanel({ company }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: baglamlar = [] } = useQuery({
    queryKey: ["firma-baglam", company.id],
    queryFn: () => base44.entities.FirmaBaglamHafizasi.filter({ company_id: company.id }, "-son_guncelleme", 1),
    enabled: !!company?.id,
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });
  const baglam = baglamlar?.[0];
  const zenginlestirme = baglam?.zenginlestirme_verisi;
  const platformBasari = baglam?.platform_basari_oranlari || {};

  const handleEnrich = async () => {
    setLoading(true);
    try {
      const result = await enricherAjan(company);
      if (result) {
        toast.success("Firma zenginleştirildi ✨");
        queryClient.invalidateQueries({ queryKey: ["firma-baglam", company.id] });
        queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      }
    } catch (e) {
      toast.error("Zenginleştirme başarısız: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const maxBasari = Math.max(1, ...Object.values(platformBasari).map(s => s.approvalRate || 0));

  return (
    <div className="space-y-4">
      {/* Enricher butonu */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Search className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Firma Bilgilerini Zenginleştir</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI; website + sektör analizi yaparak hedef kitle, anahtar kelime, içerik fırsatları çıkarır.
              </p>
            </div>
          </div>
          <Button
            onClick={handleEnrich}
            disabled={loading}
            style={{ backgroundColor: "#FF6B35", color: "white" }}
            className="hover:opacity-90"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analiz Ediliyor...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" /> Zenginleştir</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Zenginleştirme sonuçları */}
      {zenginlestirme && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">AI Marka Analizi</h3>
              {zenginlestirme.zenginlestirme_tarihi && (
                <span className="text-[10px] text-muted-foreground">
                  ({new Date(zenginlestirme.zenginlestirme_tarihi).toLocaleDateString("tr-TR")})
                </span>
              )}
            </div>

            {zenginlestirme.one_cikan_deger_onerisi && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-xs">
                <strong>Değer Önerisi:</strong> {zenginlestirme.one_cikan_deger_onerisi}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {zenginlestirme.hedef_kitle_ozeti && (
                <div className="text-xs">
                  <div className="font-medium text-muted-foreground mb-1">Hedef Kitle</div>
                  <p className="text-foreground">{zenginlestirme.hedef_kitle_ozeti}</p>
                </div>
              )}
              {zenginlestirme.rakip_avantajlar && (
                <div className="text-xs">
                  <div className="font-medium text-muted-foreground mb-1">Rakip Avantajları</div>
                  <p className="text-foreground">{zenginlestirme.rakip_avantajlar}</p>
                </div>
              )}
            </div>

            {Array.isArray(zenginlestirme.icerik_firsatlari) && zenginlestirme.icerik_firsatlari.length > 0 && (
              <div className="text-xs">
                <div className="font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> İçerik Fırsatları
                </div>
                <ul className="space-y-0.5">
                  {zenginlestirme.icerik_firsatlari.map((f, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-orange-500">•</span> <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
              {zenginlestirme.en_uygun_ton && (
                <Badge variant="outline" className="text-[10px]">Ton: {zenginlestirme.en_uygun_ton}</Badge>
              )}
              {Array.isArray(zenginlestirme.onerilen_platformlar) && zenginlestirme.onerilen_platformlar.map(p => (
                <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Firma Analizi — platform başarı + pillar */}
      {baglam && (Object.keys(platformBasari).length > 0 || baglam.icerik_ozeti?.toplam_icerik > 0) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold">Firma Analizi</h3>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {baglam.icerik_ozeti?.toplam_icerik || 0} içerik
              </Badge>
            </div>

            {/* Platform başarı bar chart (CSS) */}
            {Object.keys(platformBasari).length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Platform Onay Oranı</div>
                {Object.entries(platformBasari).map(([p, stats]) => (
                  <div key={p} className="flex items-center gap-2 text-xs">
                    <span className="w-32 truncate">{p}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${(stats.approvalRate / maxBasari) * 100}%` }}
                      />
                    </div>
                    <span className="w-20 text-right tabular-nums text-muted-foreground">
                      %{stats.approvalRate || 0} ({stats.approved}/{stats.total})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Pillar dağılım chips */}
            {baglam.icerik_ozeti?.pillar_dagilim && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">İçerik Direği Dağılımı</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(baglam.icerik_ozeti.pillar_dagilim).map(([p, sayi]) => (
                    <Badge key={p} variant={sayi > 0 ? "secondary" : "outline"} className="text-[11px]">
                      {PILLAR_LABEL[p] || p}: {sayi}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}