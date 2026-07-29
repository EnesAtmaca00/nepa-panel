// Üretilmiş sunum görüntüleme — 3 sekme + revizyon + aksiyonlar
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, MessageCircle, Printer, FileDown, RefreshCw, CheckSquare, Loader2, Lock, TrendingUp, AlertTriangle, Zap, Target } from "lucide-react";
import { toast } from "sonner";
import SlideRenderer from "./SlideRenderer";
import { buildSlideTheme } from "@/lib/slideTheme";
import { pptxUret, pptxIcNotlarUret } from "@/lib/presentationPPTX";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  ready: "bg-blue-100 text-blue-700",
  sent: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function PresentationOutput({ presentation, onBack, onRevise, onUpdateLocal }) {
  const [status, setStatus] = useState(presentation.status || "draft");
  const [revFeedback, setRevFeedback] = useState("");
  const [revLoading, setRevLoading] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const slides = presentation.slides || [];
  const plainText = presentation.plain_text_version || "";
  const icNotlar = presentation.internal_notes || null;
  const arastirmaKaynaklari = presentation.research_sources || [];
  const hasIcNotlar = icNotlar && Object.keys(icNotlar).length > 0;

  // Tema + logo — firmaya özel görsel kimlik
  const tema = React.useMemo(
    () => buildSlideTheme({
      renkler: presentation.firma_baglam?.renkler || presentation.color_palette || [],
      sektor: presentation.sector || "",
    }),
    [presentation.firma_baglam, presentation.color_palette, presentation.sector]
  );
  const logoUrl = presentation.logo_url || null;
  const baglam = presentation.firma_baglam || {};

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try {
      await base44.entities.Presentation.update(presentation.id, { status: newStatus });
      onUpdateLocal({ ...presentation, status: newStatus });
      toast.success(`Durum: ${newStatus}`);
    } catch (e) {
      toast.error("Durum güncellenemedi");
    }
  };

  const handleSlideUpdate = async (index, newSlide) => {
    const newSlides = [...slides];
    newSlides[index] = newSlide;
    try {
      await base44.entities.Presentation.update(presentation.id, { slides: newSlides });
      onUpdateLocal({ ...presentation, slides: newSlides });
      toast.success("Slide güncellendi");
    } catch (e) {
      toast.error("Kaydedilemedi");
    }
  };

  const handleRevision = async () => {
    if (!revFeedback.trim()) return;
    setRevLoading(true);
    try {
      await onRevise(revFeedback.trim());
      setRevFeedback("");
    } finally {
      setRevLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(plainText);
    toast.success("Kopyalandı");
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(plainText.substring(0, 4000))}`;
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const [pptxLoading, setPptxLoading] = useState(false);
  const [pptxIcLoading, setPptxIcLoading] = useState(false);

  const handlePPTXMusteri = async () => {
    setPptxLoading(true);
    try {
      const dosya = await pptxUret(
        {
          sunum_basligi: presentation.title || presentation.client_name,
          slides,
          kisa_ozet: presentation.short_summary,
        },
        tema,
        logoUrl,
        presentation.client_name || "sunum",
        "musteri"
      );
      toast.success(`İndirildi: ${dosya}`);
    } catch (e) {
      toast.error("PPTX oluşturulamadı: " + e.message);
    } finally {
      setPptxLoading(false);
    }
  };

  const handlePPTXIcNotlar = async () => {
    if (!hasIcNotlar) {
      toast.error("İç notlar bu sunumda yok");
      return;
    }
    setPptxIcLoading(true);
    try {
      const dosya = await pptxIcNotlarUret(icNotlar, tema, logoUrl, presentation.client_name || "sunum");
      toast.success(`İndirildi: ${dosya}`);
    } catch (e) {
      toast.error("PPTX oluşturulamadı: " + e.message);
    } finally {
      setPptxIcLoading(false);
    }
  };

  const handleCreateTask = async () => {
    setCreatingTask(true);
    try {
      const due = new Date();
      due.setDate(due.getDate() + 3);
      await base44.entities.Task.create({
        title: `${presentation.client_name} sunum takibi`,
        description: `Sunum sonrası takip — ${presentation.title || ""}`,
        due_date: due.toISOString().split("T")[0],
        status: "todo",
        company_id: presentation.company_id || null,
        company_name: presentation.client_name,
      });
      toast.success("Görev oluşturuldu");
    } catch (e) {
      toast.error("Görev oluşturulamadı: " + e.message);
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* DÜZELTME 3: Print CSS — sadece sunum içeriğini bas */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .sunum-print, .sunum-print * { visibility: visible; }
          .sunum-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .slide-card { page-break-after: always; break-after: page; box-shadow: none !important; border: none !important; margin: 0 !important; border-radius: 0 !important; }
          body { font-size: 12pt; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3 no-print">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Listeye dön
        </button>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Taslak</SelectItem>
              <SelectItem value="ready">Hazır</SelectItem>
              <SelectItem value="sent">Gönderildi</SelectItem>
              <SelectItem value="accepted">Kabul</SelectItem>
              <SelectItem value="rejected">Red</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleCreateTask} disabled={creatingTask}>
            {creatingTask ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckSquare className="w-3 h-3 mr-1" />}
            Görev Oluştur
          </Button>
        </div>
      </div>

      {/* Başlık */}
      <div className="no-print">
        <h1 className="text-2xl font-bold">{presentation.title || presentation.client_name}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[status]}`}>{status}</span>
          {presentation.revision_count > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">v{presentation.version || 1}</span>
          )}
          {presentation.short_summary && (
            <span className="text-xs text-muted-foreground">— {presentation.short_summary}</span>
          )}
        </div>

        {/* Bağlam rozetleri — hangi firma verisi kullanıldı */}
        {(baglam.marka_sesi_kullanildi || baglam.style_memory_kullanildi || baglam.sektor_icgoru_kullanildi || baglam.zenginlestirme_kullanildi || presentation.audit_score) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {baglam.marka_sesi_kullanildi && (
              <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">🎙️ Marka sesi</span>
            )}
            {baglam.style_memory_kullanildi && (
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">🎨 Görsel kimlik</span>
            )}
            {baglam.sektor_icgoru_kullanildi && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">📊 Sektör içgörüsü</span>
            )}
            {baglam.zenginlestirme_kullanildi && (
              <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-full">💎 Enricher</span>
            )}
            {presentation.audit_score && (
              <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">✓ Audit: {presentation.audit_score}/100</span>
            )}
            {logoUrl && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">🖼️ Logo</span>
            )}
          </div>
        )}
      </div>

      {/* Araştırma kaynakları rozetleri */}
      {arastirmaKaynaklari.length > 0 && (
        <div className="no-print flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground">🔍 Araştırma kaynakları:</span>
          {arastirmaKaynaklari.slice(0, 8).map((k, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Sekmeler */}
      <Tabs defaultValue="preview" className="no-print">
        <TabsList>
          <TabsTrigger value="preview">📊 Müşteri Sunumu</TabsTrigger>
          {hasIcNotlar && <TabsTrigger value="internal">🔒 İç Notlar</TabsTrigger>}
          <TabsTrigger value="text">📄 Düz Metin</TabsTrigger>
          <TabsTrigger value="download">📥 İndir</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-3 mt-4">
          {/* GÜNCELLEME 4: Slide sayısı + model + hızlı PDF butonu */}
          {slides.length > 0 && (
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{slides.length} slayt</span>
                {presentation.model_used && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {presentation.model_used.split("/")[1] || presentation.model_used}
                  </span>
                )}
              </div>
              <button
                onClick={handlePrint}
                className="text-sm text-muted-foreground hover:text-orange-500 flex items-center gap-1"
              >
                <Printer className="w-3 h-3" /> PDF
              </button>
            </div>
          )}
          {/* DÜZELTME 2: slides boşsa güvenli boş-durum + tekrar dene */}
          {slides.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <p className="text-4xl">📊</p>
              <p className="text-sm">Sunum içeriği henüz oluşturulmadı.</p>
              {presentation.generation_status === "error" && (
                <p className="text-xs text-red-600">Önceki üretim başarısız oldu.</p>
              )}
              <Button
                onClick={onBack}
                size="sm"
                variant="outline"
                className="mt-2"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Listeye dön ve yeniden oluştur
              </Button>
            </div>
          ) : (
            slides.map((s, i) => (
              <SlideRenderer
                key={i}
                slide={s}
                onUpdate={(ns) => handleSlideUpdate(i, ns)}
                tema={tema}
                logoUrl={logoUrl}
                totalSlides={slides.length}
              />
            ))
          )}
        </TabsContent>

        {hasIcNotlar && (
          <TabsContent value="internal" className="mt-4 space-y-4">
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <h3 className="font-semibold text-sm">Sadece ajans ekibi için — müşteriye gösterilmez</h3>
                </div>
                {icNotlar.ozet && (
                  <p className="text-sm text-slate-700">{icNotlar.ozet}</p>
                )}
              </CardContent>
            </Card>

            {icNotlar.maliyet_tahmini?.kalemler?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    💰 Maliyet Tahmini
                    <span className="text-xs font-normal text-muted-foreground">
                      Toplam: {icNotlar.maliyet_tahmini.toplam_min}–{icNotlar.maliyet_tahmini.toplam_max} {icNotlar.maliyet_tahmini.para_birimi || "EUR"}
                    </span>
                  </h3>
                  <div className="space-y-1.5">
                    {icNotlar.maliyet_tahmini.kalemler.map((k, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 text-sm py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium">{k.hizmet}</p>
                          {k.aciklama && <p className="text-xs text-muted-foreground">{k.aciklama}</p>}
                        </div>
                        <span className="text-sm font-mono whitespace-nowrap">
                          {k.min}–{k.max}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {icNotlar.muzakere_noktalari?.length > 0 && (
                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-blue-700">
                      <Target className="w-4 h-4" /> Müzakere Noktaları
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {icNotlar.muzakere_noktalari.map((n, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-blue-500">→</span><span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {icNotlar.riskler?.length > 0 && (
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" /> Riskler
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {icNotlar.riskler.map((n, i) => (
                        <li key={i} className="flex gap-2 text-red-900">
                          <span className="text-red-500">!</span><span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {icNotlar.firsatlar?.length > 0 && (
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-green-700">
                      <TrendingUp className="w-4 h-4" /> Fırsatlar (Upsell)
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {icNotlar.firsatlar.map((n, i) => (
                        <li key={i} className="flex gap-2 text-green-900">
                          <span className="text-green-500">+</span><span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {icNotlar.rakip_zayifliklari?.length > 0 && (
                <Card className="border-orange-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-orange-700">
                      <Zap className="w-4 h-4" /> Rakip Zayıflıkları
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {icNotlar.rakip_zayifliklari.map((n, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-orange-500">×</span><span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {icNotlar.oncelikli_hizmetler?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">⭐ Öncelikli Hizmetler</h3>
                  <div className="flex flex-wrap gap-2">
                    {icNotlar.oncelikli_hizmetler.map((h, i) => (
                      <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                        {h}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {icNotlar.not && (
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2">📝 Stratejik Not</h3>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{icNotlar.not}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="text" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <textarea
                value={plainText}
                readOnly
                rows={15}
                className="w-full border rounded-md p-3 text-sm font-mono"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" /> Kopyala
                </Button>
                <Button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
                  <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp'a Gönder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Sunumu indir, yazdır veya paylaş.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handlePPTXMusteri}
                  disabled={pptxLoading || slides.length === 0}
                  className="h-12 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {pptxLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                  📊 Müşteri PPTX İndir
                </Button>

                <Button
                  onClick={handlePPTXIcNotlar}
                  disabled={pptxIcLoading || !hasIcNotlar}
                  variant="outline"
                  className="h-12 border-amber-300"
                >
                  {pptxIcLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  🔒 İç Notlar PPTX İndir
                </Button>

                <Button onClick={handlePrint} variant="outline" className="h-12">
                  <Printer className="w-4 h-4 mr-2" /> PDF Olarak Yazdır
                </Button>

                <Button onClick={handleCopy} variant="outline" className="h-12">
                  <Copy className="w-4 h-4 mr-2" /> Düz Metni Kopyala
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 PPTX dosyaları PowerPoint / Keynote / Google Slides'da açılır.
                {!hasIcNotlar && " (Bu sunumda iç notlar yok — eski format olabilir.)"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print için tüm slide'ları arka arkaya göster — DÜZELTME 3: sunum-print sınıfı */}
      <div className="sunum-print hidden print:block">
        {slides.map((s, i) => (
          <SlideRenderer
            key={i}
            slide={s}
            onUpdate={() => {}}
            tema={tema}
            logoUrl={logoUrl}
            totalSlides={slides.length}
          />
        ))}
      </div>

      {/* Revizyon */}
      <Card className="no-print">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Revizyon İste</h3>
            {presentation.revision_count > 0 && (
              <span className="text-xs text-muted-foreground">({presentation.revision_count} revizyon)</span>
            )}
          </div>
          <textarea
            value={revFeedback}
            onChange={(e) => setRevFeedback(e.target.value)}
            placeholder="Neyi değiştirmek istersiniz? Örn: Fiyatlandırma kısmını çıkar, takvimi 6 aya uzat..."
            rows={3}
            className="w-full border rounded-md p-2 text-sm"
            disabled={revLoading}
          />
          <Button
            onClick={handleRevision}
            disabled={!revFeedback.trim() || revLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {revLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Güncelle
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}