// Ajanlarla Sohbet — İleri Seviye Persona'lar + Firma Bağlam Enjeksiyonu
import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, Users, Trash2 } from "lucide-react";
import { callAI } from "@/lib/aiEngine";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const PERSONAS = {
  researcher: `Sen Ne-Pa ajansının Araştırmacı ajanısın.

KİMLİĞİN:
- Veri odaklı, analitik düşünen, merakı yüksek bir araştırmacısın
- Her iddiayı veriyle desteklersin, varsayım yapmazsın
- Kaynak belirtirsin, belirsizlikleri açıkça söylersin

UZMANLIK ALANLARIN:
- Pazar araştırması, rakip analizi, trend tespiti
- Hedef kitle davranış analizi, sosyal medya metrikleri
- Sektör benchmarkları, içerik performans verileri

YANITLAMA KURALLARI:
- Somut veri ve sayılarla konuş
- "Tahminimce" yerine "Veriler gösteriyor ki" kullan
- Araştırma boşluklarını belirt, ek veri toplama öner`,

  drafter: `Sen Ne-Pa ajansının Taslaklayıcı ajanısın.

KİMLİĞİN:
- Yaratıcı, trend-takipçi, marka sesine duyarlı bir içerik üreticisisin
- Hook yazmayı, hikaye anlatmayı ve dikkat çekmeyi biliyorsun
- Her platformun dil ve format kodlarına hakimsin

UZMANLIK ALANLARIN:
- Caption yazımı (AIDA framework), görsel brief'leri
- Hashtag stratejisi, engagement tetikleyicileri
- Platform-spesifik içerik optimizasyonu (IG, TikTok, LinkedIn)

YANITLAMA KURALLARI:
- Fikirlerini somut örneklerle sun — sadece konsept değil, uygulanabilir taslak ver
- Marka sesini soru olarak sor: "Bu marka samimi mi yoksa kurumsal mı konuşuyor?"
- Her öneride platform belirt`,

  auditor: `Sen Ne-Pa ajansının Denetçi ajanısın.

KİMLİĞİN:
- Dikkatli, objektif, yapıcı eleştiri yapan kalite kontrol uzmanısın
- Sorunları tespit eder ama her zaman çözüm önerisi de sunarsın
- "Bu kötü" yerine "Bu şu nedenle iyileştirilebilir" dersin

UZMANLIK ALANLARIN:
- Marka uyumluluğu: ton tutarlılığı, yasaklı kelime kontrolü
- Teknik kalite: yazım, format, CTA varlığı, görsel uyum
- Stratejik uyum: hedef kitle, içerik pillar dengesi

YANITLAMA KURALLARI:
- 0-100 arası skor ver, nedenini açıkla
- Her sorun için somut çözüm öner
- Olumlu noktaları da belirt (sandviç tekniği)`,

  enricher: `Sen Ne-Pa ajansının Enricher (Zenginleştirici) ajanısın.

KİMLİĞİN:
- Detaycı, araştırmacı, stratejik düşünen bir marka analistisin
- Firmaların gizli potansiyellerini ortaya çıkarırsın
- Web siteleri, sosyal medya profilleri ve sektör verilerinden anlam çıkarırsın

UZMANLIK ALANLARIN:
- Marka konumlandırma analizi, değer önerisi formülasyonu
- Hedef kitle segmentasyonu, pazar fırsatı tespiti
- Rekabet avantajı analizi

YANITLAMA KURALLARI:
- Firma hakkında bilgi istenince: mevcut verileri değerlendir, eksikleri belirt
- Stratejik önerileri somut ve uygulanabilir tut
- Sektör karşılaştırmaları yap`,

  analyst: `Sen Ne-Pa ajansının Analyst (Analist) ajanısın.

KİMLİĞİN:
- Sayıları hikayeye çeviren, trend tespit eden veri bilimcisin
- Korelasyonları bulur, nedensellik önerirsin
- Dashboard dili konuşursun: KPI, ROI, dönüşüm oranı

UZMANLIK ALANLARIN:
- İçerik performans analizi (onay oranı, platform başarısı)
- Sektör bazlı karşılaştırma, cross-firm learning
- Pillar dağılımı optimizasyonu, trend öngörüsü

YANITLAMA KURALLARI:
- Sayıları bağlama koy: "Onay oranı %72 — sektör ortalaması %65'in üzerinde"
- Trend yönünü belirt: artış/düşüş/stabil
- Aksiyon önerisiyle bitir: "Bu veriye göre..."`,

  anomaly: `Sen Ne-Pa ajansının Anomali Dedektörüsün.

KİMLİĞİN:
- Erken uyarı sistemisin — sorunları büyümeden yakalar
- Proaktif ve çözüm odaklısın, sadece sorun bildirmezsin
- Aciliyet sınıflandırması yaparsın: kritik / uyarı / bilgi

UZMANLIK ALANLARIN:
- İçerik boşluğu tespiti (hangi firma kaç gündür üretimsiz)
- Finansal riskler (geciken faturalar, biten sözleşmeler)
- Operasyonel darboğazlar (takılı projeler, tamamlanmamış görevler)

YANITLAMA KURALLARI:
- Aciliyete göre sırala: 🔴 Kritik → 🟡 Uyarı → 🔵 Bilgi
- Her sorun için aksiyon öner
- "Her şey yolunda" da bir cevap — gereksiz alarm üretme`,
};

export default function AjanChat({ ajanlar = [] }) {
  const [secilen, setSecilen] = useState([]);
  const [mesajlar, setMesajlar] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const { data: settings = {} } = useQuery({
    queryKey: ["app-settings-agent-chat"],
    queryFn: async () => (await base44.entities.AppSettings.list())?.[0] || {},
    initialData: {},
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  // Aktif firmaları yükle — ajan sohbetine bağlam vermek için
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-agent-chat"],
    queryFn: () => base44.entities.Company.filter({ status: "active", deleted: false }, "name", 10),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mesajlar, loading]);

  const toggle = (role) => setSecilen(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  const tumunuSec = () => setSecilen(ajanlar.map(a => a.key));
  const temizle = () => setSecilen([]);
  const sohbetiTemizle = () => setMesajlar([]);

  const firmaOzeti = companies.slice(0, 5).map(c => `${c.name} (${c.sector || "—"})`).join(", ");

  const gonder = async () => {
    const text = input.trim();
    if (!text || secilen.length === 0 || loading) return;
    setInput("");
    setMesajlar(prev => [...prev, { role: "user", content: text, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const cevaplar = [];
      for (const role of secilen) {
        const ajan = ajanlar.find(a => a.key === role);
        const oncekiCevaplar = cevaplar.length > 0
          ? "\n\n── Diğer ajanların görüşleri ──\n" + cevaplar.map(c => `[${c.ajan}]: ${c.content}`).join("\n\n")
          : "";

        const grupNotu = secilen.length > 1
          ? "\n\nBu bir GRUP SOHBET. Diğer ajanların görüşlerini gör — katıl, ekle veya farklı açıdan katkı yap. Tekrar etme."
          : "";

        const firmaBaglam = firmaOzeti ? `\n\nAktif Firmalar: ${firmaOzeti}` : "";

        try {
          const res = await callAI({
            taskType: "agent_chat",
            systemPrompt: (PERSONAS[role] || `Sen ${role} ajanısın. Uzmanlık alanında kısa ve net cevap ver.`) + grupNotu + firmaBaglam,
            userPrompt: text + oncekiCevaplar,
            jsonMode: false,
            settings,
            maxTokens: 400,
          });
          cevaplar.push({
            role: "assistant",
            ajan: ajan?.name || role,
            ajanKey: role,
            content: res.text || "—",
            model: res.model || "",
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          cevaplar.push({
            role: "assistant",
            ajan: ajan?.name || role,
            ajanKey: role,
            content: `❌ ${e.message}`,
            error: true,
            timestamp: new Date().toISOString(),
          });
        }
      }
      setMesajlar(prev => [...prev, ...cevaplar]);
    } catch (e) {
      toast.error("Ajan cevap veremedi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Sol: Ajan seçimi */}
          <div className="border-r p-3 md:max-h-[500px] md:overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Ajan Seç</h4>
              <div className="flex gap-1">
                <button onClick={tumunuSec} className="text-[10px] text-accent hover:underline">Tümü</button>
                {secilen.length > 0 && (
                  <button onClick={temizle} className="text-[10px] text-muted-foreground hover:underline">Temizle</button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">Tekil veya grup sohbet — ajanlar birbirinin cevabını görür</p>
            <div className="space-y-1.5">
              {ajanlar.map(a => {
                const Icon = a.icon;
                const active = secilen.includes(a.key);
                return (
                  <button
                    key={a.key}
                    onClick={() => toggle(a.key)}
                    className={`w-full text-left p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                      active ? "border-accent bg-accent-bg" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="flex-1 truncate">{a.name}</span>
                    {active && <span className="text-accent">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sağ: Chat */}
          <div className="md:col-span-2 flex flex-col h-[500px]">
            <div className="bg-muted/40 px-4 py-2 border-b text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                {secilen.length === 0 ? (
                  <span className="text-muted-foreground">Sohbete başlamak için ajan seçin</span>
                ) : secilen.length === 1 ? (
                  <span>{ajanlar.find(a => a.key === secilen[0])?.name} ile sohbet</span>
                ) : (
                  <><Users className="w-3 h-3" /> {secilen.length} ajan ile grup sohbet</>
                )}
              </div>
              {mesajlar.length > 0 && (
                <button onClick={sohbetiTemizle} className="text-muted-foreground hover:text-foreground p-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {mesajlar.length === 0 && (
                <div className="text-center py-10 text-xs text-muted-foreground space-y-2">
                  <p>💬 Ajan seçip soru sor — her ajan kendi uzmanlığıyla cevap verir</p>
                  <p className="text-[10px] opacity-60">Grup sohbette ajanlar birbirinin cevabını görür ve katkı yapar</p>
                </div>
              )}
              {mesajlar.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    m.role === "user" ? "bg-primary text-primary-foreground" :
                    m.error ? "bg-red-50 border border-red-200 text-red-700" :
                    "bg-muted"
                  }`}>
                    {m.role === "assistant" && m.ajan && (
                      <div className="text-[10px] font-semibold text-accent mb-0.5">{m.ajan}</div>
                    )}
                    {m.role === "user" ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    ) : (
                      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 text-xs leading-relaxed">{m.content}</ReactMarkdown>
                    )}
                    {m.model && (
                      <div className="text-[9px] text-muted-foreground mt-1 opacity-50">{m.model.split("/").pop()}</div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2 text-xs flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {secilen.length > 1 ? `${secilen.length} ajan düşünüyor...` : "Ajan düşünüyor..."}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t p-2 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gonder(); } }}
                disabled={secilen.length === 0 || loading}
                placeholder={secilen.length === 0 ? "Önce ajan seçin..." : "Ajana sor..."}
                className="flex-1 border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-muted/40"
              />
              <button
                onClick={gonder}
                disabled={!input.trim() || secilen.length === 0 || loading}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}