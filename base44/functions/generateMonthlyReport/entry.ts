// AjansPro — Aylık rapor oluştur (özet + AI yorum)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, month, year } = await req.json();
    const company = await base44.asServiceRole.entities.Company.get(company_id);
    if (!company) return Response.json({ error: "Şirket bulunamadı" }, { status: 404 });

    const m = String(month).padStart(2, "0");
    const start = `${year}-${m}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${m}-${String(lastDay).padStart(2, "0")}`;

    const invoices = await base44.asServiceRole.entities.Invoice.filter({
      company_id, issue_date: { $gte: start, $lte: end }
    }, "-issue_date", 100);

    const ideas = await base44.asServiceRole.entities.ContentIdea.filter({
      company_id, scheduled_date: { $gte: start, $lte: end }
    }, "-scheduled_date", 200);

    const recurring = await base44.asServiceRole.entities.RecurringContentInstance.filter({
      company_id, target_date: { $gte: start, $lte: end }
    }, "-target_date", 100);

    const summary = {
      total_billed: invoices.reduce((s, i) => s + (i.amount || 0), 0),
      total_paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0),
      content_published: ideas.filter(i => i.work_status === "published").length,
      content_total: ideas.length,
      recurring_done: recurring.filter(r => r.status === "done").length,
      recurring_total: recurring.length,
      currency: company.currency,
    };

    const prompt = `Marka: ${company.name}. Ay: ${month}/${year}.
Veri: ${JSON.stringify(summary)}.
3-4 cümlelik Türkçe aylık özet yaz: ne yapıldı, neyi başardık, gelecek ay için öneri.`;

    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "monthly_report",
      prompt,
      json_mode: false,
    });

    const summaryText = (aiRes.data || aiRes).result || "";

    const existing = await base44.asServiceRole.entities.MonthlyReport.filter({
      company_id, month, year,
    }, "-generated_at", 1);

    const payload = {
      company_id,
      company_name: company.name,
      month, year,
      generated_at: new Date().toISOString(),
      summary_data: { ...summary, ai_summary: summaryText },
    };

    let saved;
    if (existing[0]) {
      saved = await base44.asServiceRole.entities.MonthlyReport.update(existing[0].id, payload);
    } else {
      saved = await base44.asServiceRole.entities.MonthlyReport.create(payload);
    }

    return Response.json({ success: true, report: saved });
  } catch (error) {
    console.error("generateMonthlyReport error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});