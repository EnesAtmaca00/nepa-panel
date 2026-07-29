// Sistem sağlık kontrolü — takılı / hatalı işlemleri tespit eder
import { base44 } from "@/api/base44Client";

const STUCK_THRESHOLD_MS = 3 * 60 * 1000; // 3 dakika

export async function checkSystemHealth() {
  const sorunlar = [];

  try {
    const generating = await base44.entities.WebsiteProject.filter({ generation_status: "generating" }).catch(() => []);
    const errored = await base44.entities.WebsiteProject.filter({ generation_status: "error" }).catch(() => []);

    const takili = generating.filter(p => {
      return Date.now() - new Date(p.updated_date).getTime() > STUCK_THRESHOLD_MS;
    });

    if (takili.length > 0) {
      sorunlar.push({
        tip: "takili_islem",
        sayi: takili.length,
        mesaj: `${takili.length} web projesi 3dk+ takılı kalmış`,
        otomatikDuzeltilebilir: true,
        items: takili.map(p => ({ id: p.id, name: p.project_name })),
      });
    }

    if (errored.length > 0) {
      sorunlar.push({
        tip: "hata",
        sayi: errored.length,
        mesaj: `${errored.length} web projesinde üretim hatası`,
        otomatikDuzeltilebilir: false,
        items: errored.map(p => ({ id: p.id, name: p.project_name })),
      });
    }
  } catch (e) {
    console.warn("Sistem sağlık kontrolü başarısız:", e?.message);
  }

  return sorunlar;
}

export async function autoFixStuckProjects() {
  const generating = await base44.entities.WebsiteProject.filter({ generation_status: "generating" }).catch(() => []);
  let fixed = 0;
  for (const p of generating) {
    const gecenMs = Date.now() - new Date(p.updated_date).getTime();
    if (gecenMs > STUCK_THRESHOLD_MS) {
      await base44.entities.WebsiteProject.update(p.id, { generation_status: "idle" }).catch(() => {});
      fixed++;
    }
  }
  return fixed;
}