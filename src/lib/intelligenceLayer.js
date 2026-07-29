// Zeka Katmanları — Chain-of-Thought, Firma Bağlam Hafızası, Ücretsiz API'ler, Sektör İçgörüsü
import { base44 } from "@/api/base44Client";

// ─── KATMAN 1: CHAIN OF THOUGHT ──────────────────────────────────────────────
export const COT_INSTRUCTION = `

DÜŞÜNME SÜRECİ:
Cevabı vermeden önce <think> etiketleri arasında şunları düşün:
- Bu görev için en kritik bilgi nedir?
- Eksik olan veya varsayım yapmam gereken şeyler var mı?
- En iyi çıktıyı nasıl üretirim?
Düşündükten sonra cevabı ver. <think> bloğunu kullanıcıya gösterme.`;

export function applyChainOfThought(systemPrompt, settings) {
  if (!settings?.chain_of_thought_enabled) return systemPrompt;
  return (systemPrompt || "") + COT_INSTRUCTION;
}

export function stripThinkBlocks(text) {
  if (!text) return "";
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// ─── KATMAN 2: FİRMA BAĞLAM HAFIZASI ─────────────────────────────────────────
export async function getFirmaBaglam(companyId) {
  if (!companyId) return null;

  const [baglamlar, icerikler] = await Promise.all([
    base44.entities.FirmaBaglamHafizasi.filter({ company_id: companyId }, "-son_guncelleme", 1).catch(() => []),
    base44.entities.ContentIdea.filter({ company_id: companyId, deleted: false }, "-created_date", 50).catch(() => []),
  ]);
  const baglam = baglamlar?.[0];

  // Platform başarı oranları
  const platformStats = {};
  icerikler.forEach(i => {
    if (!i.platform) return;
    if (!platformStats[i.platform]) platformStats[i.platform] = { total: 0, approved: 0, scores: [] };
    platformStats[i.platform].total++;
    if (["approved", "client_approved"].includes(i.approval_status)) platformStats[i.platform].approved++;
    if (i.audit_score) platformStats[i.platform].scores.push(i.audit_score);
  });
  Object.keys(platformStats).forEach(p => {
    const s = platformStats[p];
    s.approvalRate = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0;
    s.avgAudit = s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0;
    delete s.scores;
  });

  // Pillar dağılımı
  const pillarDagilim = { egit: 0, eglendir: 0, sat: 0, guven: 0 };
  icerikler.forEach(i => { if (i.content_pillar && pillarDagilim[i.content_pillar] !== undefined) pillarDagilim[i.content_pillar]++; });

  const baglamOzeti = {
    toplam_icerik: icerikler.length,
    platform_basari: platformStats,
    pillar_dagilim: pillarDagilim,
    son_10_baslik: icerikler.slice(0, 10).map(i => i.title).filter(Boolean),
    zenginlestirme: baglam?.zenginlestirme_verisi || null,
    sektor_icgoru: baglam?.sektor_icgoru || null,
  };

  // Persist
  try {
    if (baglam) {
      await base44.entities.FirmaBaglamHafizasi.update(baglam.id, {
        icerik_ozeti: baglamOzeti,
        platform_basari_oranlari: platformStats,
        son_guncelleme: new Date().toISOString(),
      });
    } else {
      await base44.entities.FirmaBaglamHafizasi.create({
        company_id: companyId,
        icerik_ozeti: baglamOzeti,
        platform_basari_oranlari: platformStats,
        son_guncelleme: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("FirmaBaglamHafizasi persist failed", e?.message);
  }

  return baglamOzeti;
}

export function baglamToPromptInjection(baglam) {
  if (!baglam) return "";
  const parts = [];
  parts.push(`Toplam içerik: ${baglam.toplam_icerik || 0}`);
  
  if (baglam.platform_basari) {
    const platforms = Object.entries(baglam.platform_basari)
      .map(([p, s]) => `${p}: %${s.approvalRate} onay`)
      .join(", ");
    if (platforms) parts.push(`Platform başarısı: ${platforms}`);
  }
  
  if (baglam.pillar_dagilim) {
    const pillarStr = Object.entries(baglam.pillar_dagilim)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    parts.push(`Pillar dağılımı: ${pillarStr}`);
  }
  
  const sonBasliklar = (baglam.son_10_baslik || []).join(", ");
  if (sonBasliklar) parts.push(`Son başlıklar (tekrar etme!): ${sonBasliklar}`);
  if (baglam.sektor_icgoru) parts.push(`Sektör içgörüsü: ${baglam.sektor_icgoru}`);
  if (baglam.zenginlestirme?.one_cikan_deger_onerisi) parts.push(`Değer önerisi: ${baglam.zenginlestirme.one_cikan_deger_onerisi}`);

  return `\n\nFİRMA GEÇMİŞİ:\n${parts.join("\n")}`;
}

// Re-export
export { newWorkflowId } from "@/lib/aiEngineHelpers";

// ─── KATMAN 3: ÜCRETSIZ API'LER ──────────────────────────────────────────────
export async function dovizKuruGuncelle(settings) {
  if (!settings?.id) return settings?.exchange_rate_eur_try || 38;
  const sonGuncelleme = settings.exchange_rate_updated_at;
  if (sonGuncelleme) {
    const saatFarki = (Date.now() - new Date(sonGuncelleme).getTime()) / 3600000;
    if (saatFarki < 6) return settings.exchange_rate_eur_try || 38;
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR");
    const data = await res.json();
    const kur = data?.rates?.TRY;
    if (kur) {
      await base44.entities.AppSettings.update(settings.id, {
        exchange_rate_eur_try: Math.round(kur * 100) / 100,
        exchange_rate_updated_at: new Date().toISOString(),
      });
      return kur;
    }
  } catch (e) {
    console.warn("Döviz kuru alınamadı:", e?.message);
  }
  return settings.exchange_rate_eur_try || 38;
}

export function pollinationsGorselUrl(prompt, genislik = 1024, yukseklik = 1024) {
  const temizPrompt = encodeURIComponent((prompt || "").replace(/[^\w\s,.-çğıöşüÇĞİÖŞÜ]/g, ""));
  return `https://image.pollinations.ai/prompt/${temizPrompt}?width=${genislik}&height=${yukseklik}&nologo=true&enhance=true`;
}

export async function jinaIcerikCikar(url) {
  if (!url) return "";
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "Accept": "application/json" }
    });
    const data = await res.json();
    return (data?.data?.content || "").substring(0, 3000);
  } catch (e) {
    console.warn("Jina okuma hatası:", e?.message);
    return "";
  }
}

// ─── KATMAN 5: ÇAPRAZ FİRMA ÖĞRENMESİ ────────────────────────────────────────
export async function sektorIcgoruAl(sektor) {
  if (!sektor) return null;
  try {
    const analizler = await base44.entities.SektorAnalizi.filter({ sektor }, "-son_analiz_tarihi", 1);
    const analiz = analizler?.[0];
    if (!analiz) return null;

    const parts = [`${sektor} sektörü analizi:`];

    if (analiz.en_basarili_platform) {
      const stats = analiz.platform_onay_oranlari?.[analiz.en_basarili_platform];
      const oran = stats?.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
      parts.push(`En yüksek onay: ${analiz.en_basarili_platform} (%${oran})`);
    }
    if (analiz.pillar_dagilimi) {
      const enAz = Object.entries(analiz.pillar_dagilimi).sort((a, b) => a[1] - b[1])[0]?.[0];
      if (enAz) parts.push(`En az kullanılan tür: ${enAz} (fırsat)`);
    }
    if (analiz.ortalama_audit_skoru > 0) {
      parts.push(`Kalite ortalaması: ${analiz.ortalama_audit_skoru}/100`);
    }
    return parts.join(". ");
  } catch (e) {
    console.warn("sektorIcgoruAl hata:", e?.message);
    return null;
  }
}