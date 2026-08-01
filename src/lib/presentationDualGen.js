import { base44 } from "@/api/base44Client";
// Çift versiyon üretici: Müşteri sunumu + Ajans iç notları
// Tek AI çağrısında iki bağlamsal çıktı.
import { arastirmaOzetiMetni } from "@/lib/presentationResearch";

function parseJSON(rawText) {
  if (!rawText) return null;
  // 1. Markdown fences temizleyerek dene
  try {
    const c = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    return JSON.parse(c);
  } catch {}
  // 2. İlk { ile son } arası
  try {
    const s = rawText.indexOf("{");
    const e = rawText.lastIndexOf("}");
    if (s !== -1 && e > s) return JSON.parse(rawText.substring(s, e + 1));
  } catch {}
  // 3. Tüm match'leri tek tek dene — bazen model iki JSON bloğu döndürür
  try {
    const all = rawText.match(/\{[\s\S]+?\}(?=\s*$|\s*\{)/g) || [];
    for (const m of all) {
      try {
        const a = JSON.parse(m);
        if (a?.musteri_versiyonu?.slides?.length || a?.slides?.length) return a;
      } catch {}
    }
  } catch {}
  return null;
}

// Drafter parse başarısız olursa devreye giren minimum güvenli fallback.
function buildMinFallback(ctx, settings) {
  const firma = ctx?.firma_adi || "Müşteri";
  const ajans = settings?.agency_name || ctx?.ajansi_adi || "Ajans";
  const iletisim = settings?.agency_email || ctx?.ajansi_email || ajans;
  const hizmetler = ctx?.tespit_edilen_hizmetler?.length
    ? ctx.tespit_edilen_hizmetler
    : ["Sosyal Medya Yönetimi", "Web Sitesi", "İçerik Üretimi"];

  return {
    musteri_versiyonu: {
      sunum_basligi: `${firma} × ${ajans}`,
      kisa_ozet: `${firma} için dijital dönüşüm önerisi.`,
      slides: [
        { no: 1, tip: "kapak", baslik: "Kapak", icerik: { ana_baslik: ajans, alt_baslik: `${firma} için Dijital Çözümler`, tarih: new Date().toLocaleDateString("tr-TR") } },
        { no: 2, tip: "hizmetler", baslik: "Hizmetlerimiz", icerik: { hizmetler: hizmetler.map((h) => ({ ad: h, aciklama: "Profesyonel hizmet", sure: "1-2 ay" })) } },
        { no: 3, tip: "cta", baslik: "Başlayalım", icerik: { baslik: "Hemen Başlayalım", adimlar: ["İletişime geçin", "Briefing yapın", "Projeye başlayın"], iletisim } },
      ],
      duz_metin: `Merhaba, ${ajans} olarak ${firma} için profesyonel dijital çözümler sunmak istiyoruz. İletişim: ${iletisim}`,
      proje_takvimi_ozeti: "3 aylık başlangıç paketi.",
      ikna_argumanlari: ["Tam hizmet kapsamı", "Şeffaf raporlama"],
    },
    ic_versiyon: {
      ozet: "Sunum otomatik oluşturuldu (AI parse hatası — tekrar deneyin).",
      muzakere_noktalari: [],
      riskler: [],
      firsatlar: [],
    },
  };
}

/**
 * OpenRouter'ı TARAYICIDAN çağırmıyoruz.
 *
 * Eski kod API anahtarını app_settings'ten okuyup fetch header'ına koyuyordu;
 * bu anahtarın tarayıcıya inmesi demekti ve sızıntının kaynağı tam olarak
 * buydu. Artık istek aiInvoke Edge Function'ına gidiyor, anahtar sunucuda
 * kalıyor (Supabase Vault).
 */
async function callAI({ system, user, model, maxTokens, temperature, taskType }) {
  const res = await base44.functions.invoke("aiInvoke", {
    task_type: taskType,
    system_prompt: system,
    prompt: user,
    model_override: model,
    max_tokens: maxTokens,
    temperature,
  });
  const d = res?.data || res || {};
  if (d.error) throw new Error(d.error);
  return d.text ?? d.content ?? "";
}

// İkinci şans çağrısı — basit, sıkı JSON prompt.
async function retryDualGen(ctx, settings, model) {
  const firma = ctx?.firma_adi || "Müşteri";
  const sektor = ctx?.sektor || "Genel";
  const hizmetler = (ctx?.tespit_edilen_hizmetler || ["Dijital pazarlama"]).join(", ");
  const ajans = settings?.agency_name || "Ajans";
  const iletisim = settings?.agency_email || ajans;
  const tarih = new Date().toLocaleDateString("tr-TR");

  const userMsg = `Şu müşteri için 6 slaytlık sunum JSON'u üret:
Müşteri: ${firma}
Sektör: ${sektor}
Hizmetler: ${hizmetler}

SADECE BU JSON FORMATINI DÖNDÜR:
{"musteri_versiyonu":{"sunum_basligi":"${firma} için Dijital Çözümler","kisa_ozet":"Profesyonel dijital dönüşüm","slides":[{"no":1,"tip":"kapak","baslik":"Kapak","icerik":{"ana_baslik":"${ajans}","alt_baslik":"${firma} için Dijital Çözümler","tarih":"${tarih}"}},{"no":2,"tip":"analiz","baslik":"Neden Dijital?","icerik":{"noktalar":["Dijital dönüşüm fırsatı","Rakiplerden öne geçme","Müşteri tabanını büyütme"],"vurgu":"Şimdi doğru zaman"}},{"no":3,"tip":"hizmetler","baslik":"Hizmetlerimiz","icerik":{"hizmetler":[{"ad":"Hizmet 1","aciklama":"Açıklama","sure":"1-2 ay"}]}},{"no":4,"tip":"takvim","baslik":"Proje Takvimi","icerik":{"aylar":[{"ay":"1. Ay","baslik":"Başlangıç","icerikler":["Analiz","Planlama"]},{"ay":"2. Ay","baslik":"Üretim","icerikler":["Tasarım","Geliştirme"]},{"ay":"3. Ay","baslik":"Lansman","icerikler":["Yayın","Takip"]}]}},{"no":5,"tip":"farklilasma","baslik":"Neden Biz?","icerik":{"noktalar":[{"baslik":"Deneyim","aciklama":"Sektör uzmanlığı"},{"baslik":"Teknoloji","aciklama":"Modern araçlar"},{"baslik":"Sonuç","aciklama":"Ölçülebilir başarı"}]}},{"no":6,"tip":"cta","baslik":"Başlayalım","icerik":{"baslik":"Hemen Başlayalım","adimlar":["Bu hafta görüşme","Önümüzdeki hafta plan","İlk sonuçlar 30 günde"],"iletisim":"${iletisim}"}}],"duz_metin":"Merhaba, ${ajans} olarak ${firma} için dijital çözümler sunuyoruz."},"ic_versiyon":{"ozet":"İç notlar","muzakere_noktalari":["Bütçe esnekliği"],"riskler":["Karar süreci uzun olabilir"],"firsatlar":["Referans müşteri olabilir"]}}`;

  try {
    const text = await callAI({
      system: "Sen JSON üreten bir sistemsin. SADECE geçerli JSON döndür. Markdown yok, açıklama yok.",
      user: userMsg,
      model,
      maxTokens: 1800,
      temperature: 0.4,
      taskType: "presentation",
    });
    return parseJSON(text);
  } catch {
    return null;
  }
}

/**
 * @param {Object} ctx — buildPresentationContext sonucu
 * @param {Object} arastirma — researchTopic sonucu
 * @param {string} inputText
 * @param {string} systemPrompt — buildPresentationSystemPrompt
 * @param {Object} settings
 */
export async function generateDualPresentation({
  ctx,
  arastirma,
  inputText,
  systemPrompt,
  settings,
}) {
  const model = settings?.model_routing?.presentation || "anthropic/claude-sonnet-4";
  const arastirmaMetni = arastirmaOzetiMetni(arastirma);

  const userPrompt = `BRIEF:
${inputText}

${arastirmaMetni ? `${arastirmaMetni}\n` : ""}
Araştırma verilerini KULLAN. Genel klişeler yerine somut, firmaya özel bilgi yaz.

İKİ AYRI versiyon üret:
1. MÜŞTERİ VERSİYONU — ikna edici, profesyonel sunum (8-12 slide)
2. İÇ VERSİYON — sadece ajans ekibi için (maliyet, müzakere, riskler)

SADECE şu JSON'u döndür (markdown yok):
{
  "musteri_versiyonu": {
    "sunum_basligi": "...",
    "kisa_ozet": "1-2 cümle",
    "slides": [
      {
        "no": 1,
        "tip": "kapak|analiz|hizmetler|strateji|takvim|farklilasma|cta|rakip|ozel",
        "baslik": "Slide başlığı",
        "gorsel_anahtar": "unsplash arama terimi (İngilizce, 2-3 kelime)",
        "icerik": {
          "ana_baslik": "...",
          "alt_baslik": "...",
          "noktalar": ["..."],
          "vurgu": "...",
          "hizmetler": [{"ad":"","aciklama":"","sure":"","fiyat_notu":""}],
          "aylar": [{"ay":"Ay 1","baslik":"","icerikler":[""]}],
          "zayiflar": ["..."],
          "firsatlar": ["..."],
          "adimlar": ["..."],
          "iletisim": "...",
          "tarih": "..."
        }
      }
    ],
    "duz_metin": "WhatsApp/email için 4-5 paragraf düz metin",
    "proje_takvimi_ozeti": "1-2 cümle",
    "ikna_argumanlari": ["..."]
  },
  "ic_versiyon": {
    "ozet": "Ajans ekibi için iç stratejik özet (3-4 cümle)",
    "maliyet_tahmini": {
      "toplam_min": 0,
      "toplam_max": 0,
      "para_birimi": "EUR",
      "kalemler": [
        {"hizmet": "Web sitesi", "min": 1500, "max": 2500, "aciklama": "5 sayfa kurumsal"}
      ]
    },
    "muzakere_noktalari": ["Esnek olabileceğimiz nokta", "..."],
    "riskler": ["Bütçe riski", "..."],
    "firsatlar": ["Upsell fırsatı", "..."],
    "rakip_zayifliklari": ["Rakibin somut zayıf noktası", "..."],
    "oncelikli_hizmetler": ["En önemli hizmet", "..."],
    "not": "Ek stratejik notlar"
  }
}`;

  const metinUzunlugu = inputText.length;
  const maxTokens = metinUzunlugu < 500 ? 2400 : metinUzunlugu < 1500 ? 3200 : 4000;

  const rawText = await callAI({
    system: systemPrompt,
    user: userPrompt,
    model,
    maxTokens,
    temperature: 0.75,
    taskType: "presentation",
  });
  let parsed = parseJSON(rawText);

  // Bazen model {slides:[...]} formatında dönüyor (eski format) — sarmal
  if (parsed && !parsed.musteri_versiyonu && parsed.slides?.length) {
    parsed = { musteri_versiyonu: parsed, ic_versiyon: { ozet: "Otomatik oluşturuldu" } };
  }

  // İkinci şans çağrısı — daha basit prompt'la
  if (!parsed?.musteri_versiyonu?.slides?.length) {
    console.warn("[Drafter] İlk parse başarısız, retry deneniyor...");
    const retryParsed = await retryDualGen(ctx, settings, model);
    if (retryParsed?.musteri_versiyonu?.slides?.length) {
      parsed = retryParsed;
    }
  }

  // Son güvenlik — minimum fallback (asla null dönme)
  let usedFallback = false;
  if (!parsed?.musteri_versiyonu?.slides?.length) {
    console.warn("[Drafter] Retry de başarısız, fallback sunum oluşturuluyor.");
    parsed = buildMinFallback(ctx, settings);
    usedFallback = true;
  }

  return { parsed, model, rawText, usedFallback };
}