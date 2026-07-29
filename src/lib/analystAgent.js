// KATMAN 4B: Analyst Ajan — İleri Seviye Sektörel Analiz
// Veri toplama + trend tespiti + öneri üretimi
import { base44 } from "@/api/base44Client";

export async function analystAjan() {
  const [firmalar, icerikler] = await Promise.all([
    base44.entities.Company.filter({ status: "active", deleted: false }, "name", 200),
    base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 500),
  ]);

  // Sektör grupları
  const sektorMap = {};
  firmalar.forEach(f => {
    if (!f.sector) return;
    if (!sektorMap[f.sector]) sektorMap[f.sector] = { firmalar: [], icerikler: [] };
    sektorMap[f.sector].firmalar.push(f);
  });
  icerikler.forEach(i => {
    const firma = firmalar.find(f => f.id === i.company_id);
    if (firma?.sector && sektorMap[firma.sector]) sektorMap[firma.sector].icerikler.push(i);
  });

  const sonuclar = [];

  for (const [sektor, veri] of Object.entries(sektorMap)) {
    if (veri.icerikler.length < 3) continue;

    // Platform başarı oranları
    const platformStats = {};
    veri.icerikler.forEach(i => {
      if (!i.platform) return;
      if (!platformStats[i.platform]) platformStats[i.platform] = { total: 0, approved: 0, scores: [] };
      platformStats[i.platform].total++;
      if (["approved", "client_approved"].includes(i.approval_status)) platformStats[i.platform].approved++;
      if (i.audit_score) platformStats[i.platform].scores.push(i.audit_score);
    });

    // Onay oranı ve ortalama skor hesapla
    let enBasarili = null;
    let enYuksekOran = -1;
    Object.entries(platformStats).forEach(([p, s]) => {
      s.approvalRate = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0;
      s.avgScore = s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0;
      delete s.scores;
      if (s.approvalRate > enYuksekOran) { enYuksekOran = s.approvalRate; enBasarili = p; }
    });

    // Pillar dağılımı
    const pillarDagilimi = { egit: 0, eglendir: 0, sat: 0, guven: 0 };
    veri.icerikler.forEach(i => {
      if (i.content_pillar && pillarDagilimi[i.content_pillar] !== undefined) pillarDagilimi[i.content_pillar]++;
    });

    // Trend tespiti — son 30 gün vs önceki 30 gün
    const now = Date.now();
    const son30 = veri.icerikler.filter(i => now - new Date(i.created_date).getTime() < 30 * 86400000);
    const onceki30 = veri.icerikler.filter(i => {
      const diff = now - new Date(i.created_date).getTime();
      return diff >= 30 * 86400000 && diff < 60 * 86400000;
    });
    
    const trendYonu = son30.length > onceki30.length ? "artış" : son30.length < onceki30.length ? "düşüş" : "stabil";

    // En az kullanılan pillar → fırsat
    const enAzPillar = Object.entries(pillarDagilimi).sort((a, b) => a[1] - b[1])[0]?.[0];
    const enCokPillar = Object.entries(pillarDagilimi).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Audit skorları
    const skorlar = veri.icerikler.filter(i => i.audit_score).map(i => i.audit_score);
    const ortSkor = skorlar.length > 0 ? Math.round(skorlar.reduce((a, b) => a + b, 0) / skorlar.length) : 0;

    // Sektörel içgörü metni üret
    const icgoruParcalari = [];
    if (enBasarili) icgoruParcalari.push(`En yüksek onay: ${enBasarili} (%${enYuksekOran})`);
    if (enAzPillar) icgoruParcalari.push(`En az: "${enAzPillar}" (fırsat)`);
    if (enCokPillar && enCokPillar === "sat" && pillarDagilimi.sat > veri.icerikler.length * 0.4) {
      icgoruParcalari.push(`⚠️ Satış içeriği oranı yüksek — dengelenmeli`);
    }
    icgoruParcalari.push(`Trend: ${trendYonu} (son 30g: ${son30.length}, önceki: ${onceki30.length})`);

    const analizVerisi = {
      sektor,
      firma_sayisi: veri.firmalar.length,
      icerik_sayisi: veri.icerikler.length,
      platform_onay_oranlari: platformStats,
      en_basarili_platform: enBasarili,
      pillar_dagilimi: pillarDagilimi,
      ortalama_audit_skoru: ortSkor,
      son_analiz_tarihi: new Date().toISOString(),
    };

    try {
      const mevcutlar = await base44.entities.SektorAnalizi.filter({ sektor });
      if (mevcutlar?.[0]) {
        await base44.entities.SektorAnalizi.update(mevcutlar[0].id, analizVerisi);
      } else {
        await base44.entities.SektorAnalizi.create(analizVerisi);
      }

      // FirmaBaglamHafizasi'na sektör içgörüsü yaz
      const icgoruMetni = icgoruParcalari.join(". ");
      for (const firma of veri.firmalar) {
        const baglamlar = await base44.entities.FirmaBaglamHafizasi.filter({ company_id: firma.id }).catch(() => []);
        if (baglamlar?.[0]) {
          await base44.entities.FirmaBaglamHafizasi.update(baglamlar[0].id, {
            sektor_icgoru: icgoruMetni,
            son_guncelleme: new Date().toISOString(),
          });
        }
      }

      sonuclar.push({ ...analizVerisi, trend: trendYonu, icgoru: icgoruMetni });
    } catch (e) {
      console.warn(`Sektör ${sektor} kaydedilemedi:`, e?.message);
    }
  }

  return { sektor_sayisi: sonuclar.length, sonuclar };
}