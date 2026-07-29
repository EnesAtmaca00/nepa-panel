// Haftalık otomatik rakip analizi — tüm aktif müşteriler için
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const companies = await base44.asServiceRole.entities.Company.filter({ status: "active" }, "name", 200);
    const eligible = companies.filter((c) => (c.competitor_handles || []).length > 0);

    const results = [];
    for (const company of eligible) {
      try {
        const res = await base44.asServiceRole.functions.invoke("analyzeCompetitors", { company_id: company.id });
        results.push({ company: company.name, ok: !res.data?.error, error: res.data?.error });

        // Bildirim oluştur
        if (!res.data?.error) {
          await base44.asServiceRole.entities.Notification.create({
            type: "competitor_report",
            company_id: company.id,
            related_entity_type: "CompetitorReport",
            related_entity_id: res.data?.report_id,
            title: `Haftalık rakip analizi hazır: ${company.name}`,
            message: res.data?.executive_summary?.slice(0, 200) || "Rapor oluşturuldu.",
            severity: "info",
            channels: ["in_app"],
          });
        }
      } catch (e) {
        results.push({ company: company.name, ok: false, error: e.message });
      }
    }

    return Response.json({ analyzed: results.length, results });
  } catch (error) {
    console.error("runWeeklyCompetitorAnalysis error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});