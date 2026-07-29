// Multi-tenant sunum bağlam fabrikası
// Firmaya özel bağlam toplar (marka sesi, style memory, sektör içgörüsü, geçmiş içerik, enricher)
// ve dinamik system prompt üretir.
import { base44 } from "@/api/base44Client";

/**
 * Firma bağlamını toplar — her firma için tamamen farklı, dinamik veri.
 * Tüm fetch'ler best-effort; hata durumunda sessizce atlanır.
 */
export async function buildPresentationContext(inputText, company, settings) {
  const ctx = {
    firma_adi: company?.name || (inputText || "").split("\n")[0].substring(0, 50),
    sektor: company?.sector || "",
    ulke: company?.country || "",
    hedef_kitle: company?.target_audience || "",
    aylik_ucret: company?.monthly_fee || 0,
    para_birimi: company?.currency || "EUR",
    web_sitesi: company?.website || "",

    marka_sesi: null,
    ton_sifatlari: [],
    yasak_kelimeler: [],

    renkler: company?.color_palette || [],
    rakipler: company?.competitor_handles || [],

    basarili_platformlar: [],
    icerik_ornekleri: [],

    sektor_icgoru: null,
    gorsel_stil: null,
    zenginlestirme: null,

    ajansi_adi: settings?.agency_name || "Ajansımız",
    ajansi_email: settings?.agency_email || "",
    ajansi_tel: settings?.agency_phone || "",
  };

  // 1. Marka sesi parse
  if (company?.brand_voice_guide) {
    try {
      const bsg = typeof company.brand_voice_guide === "string"
        ? JSON.parse(company.brand_voice_guide)
        : company.brand_voice_guide;
      ctx.marka_sesi = bsg;
      ctx.ton_sifatlari = bsg.ton_sifatlari || [];
      ctx.yasak_kelimeler = bsg.yasak_kelimeler || [];
    } catch {
      ctx.marka_sesi = { raw: String(company.brand_voice_guide).substring(0, 500) };
    }
  }

  // 2. StyleMemory
  if (company?.id) {
    try {
      const sm = await base44.entities.StyleMemory.filter({ company_id: company.id });
      if (sm?.[0]) {
        ctx.gorsel_stil = {
          renkler: sm[0].dominant_colors || [],
          mood: sm[0].mood_tags || [],
          prompt_injection: sm[0].prompt_injection || "",
        };
        if (ctx.gorsel_stil.renkler.length > 0) ctx.renkler = ctx.gorsel_stil.renkler;
      }
    } catch {}
  }

  // 3. Geçmiş içerik performansı
  if (company?.id) {
    try {
      const icerikler = await base44.entities.ContentIdea.filter(
        { company_id: company.id, deleted: false },
        "-created_date",
        20
      );
      const platformStats = {};
      (icerikler || []).forEach((i) => {
        if (!i.platform) return;
        if (!platformStats[i.platform]) platformStats[i.platform] = { total: 0, approved: 0 };
        platformStats[i.platform].total++;
        if (["approved", "client_approved"].includes(i.approval_status)) {
          platformStats[i.platform].approved++;
        }
      });
      let enIyi = null, enYuksek = 0;
      Object.entries(platformStats).forEach(([p, s]) => {
        const oran = s.total > 0 ? s.approved / s.total : 0;
        if (oran > enYuksek) { enYuksek = oran; enIyi = p; }
      });
      if (enIyi) ctx.basarili_platformlar = [enIyi];

      ctx.icerik_ornekleri = (icerikler || [])
        .filter((i) => (i.audit_score || 0) > 75)
        .slice(0, 3)
        .map((i) => i.title)
        .filter(Boolean);
    } catch {}
  }

  // 4. Sektörel içgörü
  if (ctx.sektor) {
    try {
      const analizler = await base44.entities.SektorAnalizi.filter({ sektor: ctx.sektor });
      if (analizler?.[0]) {
        ctx.sektor_icgoru = {
          en_basarili_platform: analizler[0].en_basarili_platform,
          ortalama_audit: analizler[0].ortalama_audit_skoru,
          pillar_dagilim: analizler[0].pillar_dagilimi,
        };
      }
    } catch {}
  }

  // 5. Firma bağlam hafızası (enricher)
  if (company?.id) {
    try {
      const baglamlar = await base44.entities.FirmaBaglamHafizasi.filter({ company_id: company.id });
      const zen = baglamlar?.[0]?.zenginlestirme_verisi;
      if (zen) {
        ctx.zenginlestirme = {
          anahtar_kelimeler: zen.brand_keywords || [],
          rakip_avantajlar: zen.rakip_avantajlar || "",
          icerik_firsatlari: zen.icerik_firsatlari || [],
          deger_onerisi: zen.one_cikan_deger_onerisi || "",
        };
      }
    } catch {}
  }

  return ctx;
}

/**
 * Bağlamdan dinamik system prompt üretir. Her firma için tamamen farklı içerikte.
 */
export function buildPresentationSystemPrompt(ctx) {
  const tonKurali = ctx.ton_sifatlari.length > 0
    ? `Ton: ${ctx.ton_sifatlari.join(", ")}.`
    : "Ton: güven verici, profesyonel, ama sıcak.";

  const yasak = ctx.yasak_kelimeler.length > 0
    ? `Şu kelimeleri ASLA kullanma: ${ctx.yasak_kelimeler.join(", ")}.`
    : "";

  const renkBilgi = ctx.renkler.length > 0 ? `Marka renkleri: ${ctx.renkler.join(", ")}.` : "";
  const sektorBilgi = ctx.sektor
    ? `Sektör: ${ctx.sektor}. Bu sektörün dinamiklerini ve terminolojisini kullan.`
    : "";
  const platformBilgi = ctx.basarili_platformlar.length > 0
    ? `Bu firmanın en iyi performans aldığı platform: ${ctx.basarili_platformlar.join(", ")}.`
    : "";
  const zenginBilgi = ctx.zenginlestirme
    ? `Firmanın güçlü yönleri: ${ctx.zenginlestirme.deger_onerisi || "—"}. Fırsatlar: ${(ctx.zenginlestirme.icerik_firsatlari || []).join(", ") || "—"}.`
    : "";
  const sektorIcgoru = ctx.sektor_icgoru
    ? `Sektörel veri: ${ctx.sektor_icgoru.en_basarili_platform || "—"} platformu bu sektörde en iyi sonuç veriyor.`
    : "";
  const ornekIcerikler = ctx.icerik_ornekleri.length > 0
    ? `Firmanın geçmişte başarılı olan içerik başlıkları: ${ctx.icerik_ornekleri.join(" | ")}. Bu tarzı yakala.`
    : "";

  return `Sen ${ctx.firma_adi} firması için çalışan dünya standartlarında bir strateji danışmanı ve sunum uzmanısın.

FİRMA PROFİLİ:
- Firma: ${ctx.firma_adi}
- Sektör: ${ctx.sektor || "belirtilmemiş"}
- Konum: ${ctx.ulke || "belirtilmemiş"}
- Hedef kitle: ${ctx.hedef_kitle || "genel"}
- Ajans: ${ctx.ajansi_adi}

${sektorBilgi}
${tonKurali}
${yasak}
${renkBilgi}
${platformBilgi}
${zenginBilgi}
${sektorIcgoru}
${ornekIcerikler}

SUNUM KALİTE STANDARTLARI:
- Her slide gerçek, uygulanabilir, o firmaya özel bilgi içermeli
- Genel klişelerden kaçın — "dijital dünyada başarı" gibi boş ifadeler kullanma
- Rakip analizi varsa somut zayıf noktaları yaz
- Strateji önerileri varsa ölçülebilir hedefler ekle
- Müşteriyi ikna et, sadece bilgi verme

KURAL: SADECE geçerli JSON döndür. Başka hiçbir şey yazma. Markdown yok, kod bloğu yok, açıklama yok.`.trim();
}

/**
 * Auditor — yasak kelime taraması + audit skoru hesaplama.
 * Bulunan yasak kelimeleri *** ile maskeler.
 */
export function runPresentationAudit(parsed, ctx) {
  let auditScore = 80;
  const result = { score: auditScore, yasak_bulunan: [], parsed };

  if (!ctx.yasak_kelimeler || ctx.yasak_kelimeler.length === 0) {
    result.score = ctx.marka_sesi ? 85 : 80;
    return result;
  }

  try {
    const json = JSON.stringify(parsed);
    const lower = json.toLowerCase();
    const bulunanlar = ctx.yasak_kelimeler.filter((k) => k && lower.includes(k.toLowerCase()));

    if (bulunanlar.length > 0) {
      let temiz = json;
      bulunanlar.forEach((k) => {
        const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        temiz = temiz.replace(re, "***");
      });
      try {
        result.parsed = JSON.parse(temiz);
      } catch {}
      result.score = Math.max(50, 85 - bulunanlar.length * 10);
      result.yasak_bulunan = bulunanlar;
    } else {
      result.score = 90;
    }
  } catch {}

  return result;
}