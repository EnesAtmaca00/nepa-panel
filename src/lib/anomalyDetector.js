// KATMAN 4C: Proaktif Anomali Dedektörü — İleri Seviye
// Dashboard'da çalışır, akıllı bildirim yönetimi ile
import { base44 } from "@/api/base44Client";

export async function anomaliDedektoru({ firmalar = [], faturalar = [], settings }) {
  if (!settings?.proactive_alerts_enabled) return [];

  const bugun = new Date();
  const bugunStr = bugun.toISOString().split("T")[0];
  const esikGun = settings.content_gap_threshold_days || 14;
  const yeniAnomaliler = [];

  // Tüm firmalar için son içeriği toplu çek
  const sonIcerikler = await Promise.all(
    firmalar.map(f =>
      base44.entities.ContentIdea.filter({ company_id: f.id, deleted: false }, "-created_date", 1)
        .then(r => ({ firma: f, son: r?.[0] }))
        .catch(() => ({ firma: f, son: null }))
    )
  );

  for (const { firma, son } of sonIcerikler) {
    // İçerik boşluğu tespiti
    if (son) {
      const gunFarki = Math.floor((bugun - new Date(son.created_date)) / 86400000);
      if (gunFarki >= esikGun) {
        yeniAnomaliler.push({
          tip: "icerik_boslugu",
          firma: firma.name,
          firma_id: firma.id,
          mesaj: `${firma.name} için ${gunFarki} gündür içerik üretilmedi`,
          severity: gunFarki >= 30 ? "critical" : "warning",
          aksiyon: `İçerik planlaması yapılmalı — /icerik-takvimi sayfasından ${firma.name} için hızlı plan oluşturun`,
        });
      }
    } else if (firma.status === "active") {
      // Hiç içerik üretilmemiş aktif firma
      yeniAnomaliler.push({
        tip: "icerik_boslugu",
        firma: firma.name,
        firma_id: firma.id,
        mesaj: `${firma.name} için henüz hiç içerik üretilmedi`,
        severity: "warning",
        aksiyon: "AI Studio'dan ilk içerik planını oluşturun",
      });
    }

    // Sözleşme bitiş kontrolü
    if (firma.contract_end_date) {
      const bitis = new Date(firma.contract_end_date);
      const kalanGun = Math.floor((bitis - bugun) / 86400000);
      if (kalanGun >= 0 && kalanGun <= 30) {
        yeniAnomaliler.push({
          tip: "sozlesme_bitiyor",
          firma: firma.name,
          firma_id: firma.id,
          mesaj: `${firma.name} sözleşmesi ${kalanGun} gün sonra bitiyor (${firma.contract_end_date})`,
          severity: kalanGun <= 7 ? "critical" : "warning",
          aksiyon: kalanGun <= 7 ? "ACİL: Sözleşme yenileme görüşmesi başlatın" : "Yenileme hatırlatması planlayın",
        });
      }
    }

    // Kuruluş yıldönümü kontrolü
    if (firma.brand_founded_date) {
      const kurulusGunu = new Date(firma.brand_founded_date);
      const buYil = new Date(bugun.getFullYear(), kurulusGunu.getMonth(), kurulusGunu.getDate());
      const kalanGunKurulus = Math.floor((buYil - bugun) / 86400000);
      if (kalanGunKurulus >= 0 && kalanGunKurulus <= 14) {
        yeniAnomaliler.push({
          tip: "yildonumu",
          firma: firma.name,
          firma_id: firma.id,
          mesaj: `${firma.name} kuruluş yıldönümü ${kalanGunKurulus} gün sonra!`,
          severity: "info",
          aksiyon: "Özel kutlama içeriği planlanabilir",
        });
      }
    }
  }

  // Overdue faturalar
  for (const fatura of faturalar) {
    if (fatura.status === "overdue" && fatura.due_date) {
      const vadeFarki = Math.floor((bugun - new Date(fatura.due_date)) / 86400000);
      yeniAnomaliler.push({
        tip: "overdue_fatura",
        firma: fatura.company_name,
        firma_id: fatura.company_id,
        mesaj: `${fatura.company_name} faturası ${vadeFarki} gündür ödenmedi — ${fatura.amount} ${fatura.currency}`,
        severity: vadeFarki > 30 ? "critical" : "warning",
        aksiyon: vadeFarki > 30 ? "Resmi hatırlatma gönderilmeli" : "Nazik ödeme hatırlatması gönderilmeli",
      });
    }
  }

  // Bugün zaten bildirilenleri filtrele
  const mevcutBildirimler = await base44.entities.Notification.filter({ type: "anomali" }, "-created_date", 50).catch(() => []);

  for (const anomali of yeniAnomaliler) {
    const zatenVar = mevcutBildirimler.some(n =>
      n.message?.includes(anomali.firma) &&
      n.created_date?.startsWith(bugunStr) &&
      n.title?.includes(
        anomali.tip === "icerik_boslugu" ? "İçerik" :
        anomali.tip === "sozlesme_bitiyor" ? "Sözleşme" :
        anomali.tip === "yildonumu" ? "Yıldönümü" : "Fatura"
      )
    );
    if (zatenVar) continue;

    const titleMap = {
      icerik_boslugu: "⚠️ İçerik Boşluğu",
      sozlesme_bitiyor: "🔴 Sözleşme Bitiyor",
      overdue_fatura: "💸 Geciken Fatura",
      yildonumu: "🎂 Yıldönümü Yaklaşıyor",
    };

    try {
      await base44.entities.Notification.create({
        type: "anomali",
        title: titleMap[anomali.tip] || "⚠️ Anomali",
        message: `${anomali.mesaj}\n💡 ${anomali.aksiyon}`,
        severity: anomali.severity,
        channels: ["in_app"],
        company_id: anomali.firma_id || "",
        read: false,
      });
    } catch (e) {
      console.warn("Anomali notification create failed", e?.message);
    }
  }

  return yeniAnomaliler;
}