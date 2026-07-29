import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TASK_MODEL_MAP = {
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
  openrouter: "google/gemini-2.5-flash-lite",
};

async function callGemini(apiKey, model, prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

async function callOpenRouter(apiKey, model, prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

async function callOpenAI(apiKey, model, prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

async function callAnthropic(apiKey, model, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: "user", content: prompt + "\n\nReturn ONLY valid JSON." }] }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "{}";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0] || {};
    const provider = settings.preferred_ai_provider || "gemini";
    const model = TASK_MODEL_MAP[provider];

    const apiKey = settings[`${provider}_api_key`];
    if (!apiKey) {
      return Response.json({
        error: `Ayarlar'da '${provider}' için API key tanımlı değil. Lütfen Ayarlar sayfasından API key gir.`
      }, { status: 400 });
    }

    // Veri topla
    const [companies, ideas, instances, tasks, invoices] = await Promise.all([
      base44.asServiceRole.entities.Company.filter({ deleted: false }, "-created_date", 100),
      base44.asServiceRole.entities.ContentIdea.filter({ deleted: false }, "-created_date", 200),
      base44.asServiceRole.entities.RecurringContentInstance.list("-target_date", 200),
      base44.asServiceRole.entities.Task.filter({ deleted: false }, "-created_date", 200),
      base44.asServiceRole.entities.Invoice.list("-issue_date", 200),
    ]);

    // Son 30 gün
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Her müşteri için özet
    const companySummaries = companies.slice(0, 20).map(c => {
      const companyIdeas = ideas.filter(i => i.company_id === c.id);
      const recentIdeas = companyIdeas.filter(i => i.created_date >= thirtyDaysAgo.toISOString());
      const publishedCount = companyIdeas.filter(i => i.work_status === "published").length;
      const pendingCount = companyIdeas.filter(i => i.work_status === "not_started" || i.work_status === "in_progress").length;
      const companyInstances = instances.filter(i => i.company_id === c.id);
      const doneInstances = companyInstances.filter(i => i.status === "done").length;
      const skippedInstances = companyInstances.filter(i => i.status === "skipped").length;
      const companyTasks = tasks.filter(t => t.company_id === c.id);
      const doneTasks = companyTasks.filter(t => t.status === "done").length;
      const overdueTasks = companyTasks.filter(t => t.status !== "done" && t.due_date && t.due_date < thirtyDaysAgoStr).length;
      const companyInvoices = invoices.filter(i => i.company_id === c.id);
      const overdueInvoices = companyInvoices.filter(i => i.status === "overdue").length;

      return {
        name: c.name,
        sector: c.sector || "Bilinmiyor",
        status: c.status,
        monthly_fee: c.monthly_fee || 0,
        currency: c.currency,
        total_content: companyIdeas.length,
        recent_content_30d: recentIdeas.length,
        published_content: publishedCount,
        pending_content: pendingCount,
        recurring_done: doneInstances,
        recurring_skipped: skippedInstances,
        tasks_done: doneTasks,
        tasks_overdue: overdueTasks,
        overdue_invoices: overdueInvoices,
        platforms: [...new Set(companyIdeas.map(i => i.platform).filter(Boolean))],
      };
    });

    const prompt = `Sen bir dijital ajans yönetim danışmanısın. Aşağıdaki müşteri verilerini analiz et ve kapsamlı stratejik öneriler sun.

MÜŞTERİ VERİLERİ (son 30 günü kapsar):
${JSON.stringify(companySummaries, null, 2)}

TOPLAM ÖZET:
- Toplam müşteri: ${companies.length}
- Aktif müşteri: ${companies.filter(c => c.status === "active").length}
- Son 30 günde üretilen içerik: ${ideas.filter(i => i.created_date >= thirtyDaysAgo.toISOString()).length}
- Tamamlanan görevler: ${tasks.filter(t => t.status === "done").length}
- Geciken faturalar: ${invoices.filter(i => i.status === "overdue").length}

Lütfen aşağıdaki JSON formatında yanıt ver:
{
  "executive_summary": "Genel durum özeti (2-3 cümle)",
  "overall_score": 75,
  "trends": [
    { "title": "Trend başlığı", "description": "Açıklama", "type": "positive|negative|neutral", "impact": "high|medium|low" }
  ],
  "client_insights": [
    { "company_name": "Müşteri adı", "health_score": 80, "status": "good|warning|critical", "key_issue": "Ana sorun veya güçlü yön", "recommendation": "Spesifik öneri" }
  ],
  "weekly_priorities": [
    { "title": "Bu hafta yapılması gereken", "description": "Detay", "priority": "high|medium|low", "affected_clients": ["müşteri1"] }
  ],
  "strategic_recommendations": [
    { "title": "Stratejik öneri başlığı", "description": "Detaylı açıklama", "category": "content|revenue|operations|client_relations", "effort": "low|medium|high", "impact": "low|medium|high" }
  ],
  "risks": [
    { "title": "Risk başlığı", "description": "Açıklama", "severity": "low|medium|high", "affected_clients": ["müşteri1"] }
  ]
}`;

    let rawResult = "";
    if (provider === "gemini") rawResult = await callGemini(apiKey, model, prompt);
    else if (provider === "openrouter") rawResult = await callOpenRouter(apiKey, model, prompt);
    else if (provider === "openai") rawResult = await callOpenAI(apiKey, model, prompt);
    else if (provider === "anthropic") rawResult = await callAnthropic(apiKey, model, prompt);

    // JSON parse
    let analysis;
    try {
      // Markdown code block varsa temizle
      const cleaned = rawResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      return Response.json({ error: "AI yanıtı parse edilemedi: " + rawResult.slice(0, 200) }, { status: 500 });
    }

    return Response.json({ analysis, model_used: model, provider, companies_analyzed: companySummaries.length });
  } catch (error) {
    console.error("analyzeClients error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});