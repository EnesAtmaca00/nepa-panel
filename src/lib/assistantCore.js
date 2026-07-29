// Asistan core logic — mevcut aiInvoke backend'i üzerinden çalışır (Base44 kredisi harcanmaz)
import { base44 } from "@/api/base44Client";
import { buildAssistantSystemPrompt, buildShortAssistantPrompt, detectIntent } from "./assistantPrompt";

// KATMAN 7: Doğal Dil Raporlama — bu kelimeler geçince metrik özeti üret
const RAPOR_TRIGGER_KELIMELERI = [
  "rapor", "özet", "ozet", "nasıl gitti", "nasil gitti", "analiz",
  "istatistik", "performans", "bu ay", "geçen ay", "gecen ay", "durum ne",
  "durum nedir", "brifing", "briefing",
];

async function buildReportMetrics() {
  const [firmalar, icerikler, faturalar, gorevler] = await Promise.all([
    base44.entities.Company.filter({ status: "active", deleted: false }, "name", 200).catch(() => []),
    base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 200).catch(() => []),
    base44.entities.Invoice.list("-created_date", 50).catch(() => []),
    base44.entities.Task.filter({ deleted: false }, "-created_date", 50).catch(() => []),
  ]);

  const buayBaslangic = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const buayIcerik = icerikler.filter(i => i.created_date >= buayBaslangic);
  const buayOnaylanan = buayIcerik.filter(i => ["approved", "client_approved"].includes(i.approval_status));
  const overdueFatura = faturalar.filter(f => f.status === "overdue");
  const bekleyenGorev = gorevler.filter(t => t.status !== "done");
  const firmasizIcerik = firmalar.length - new Set(icerikler.map(i => i.company_id)).size;

  const overdueTRY = overdueFatura.filter(f => f.currency === "TRY").reduce((s, f) => s + (f.amount || 0), 0);
  const overdueEUR = overdueFatura.filter(f => f.currency === "EUR").reduce((s, f) => s + (f.amount || 0), 0);

  // En aktif firma
  const firmaIcerikSayisi = {};
  icerikler.forEach(i => { if (i.company_id) firmaIcerikSayisi[i.company_id] = (firmaIcerikSayisi[i.company_id] || 0) + 1; });
  const enAktifId = Object.entries(firmaIcerikSayisi).sort((a, b) => b[1] - a[1])[0]?.[0];
  const enAktifFirma = firmalar.find(f => f.id === enAktifId);

  return `Aktif firma sayısı: ${firmalar.length}
Bu ay üretilen içerik: ${buayIcerik.length}
Bu ay onaylanan içerik: ${buayOnaylanan.length} (%${buayIcerik.length > 0 ? Math.round(buayOnaylanan.length / buayIcerik.length * 100) : 0})
Overdue fatura: ${overdueFatura.length} adet${overdueTRY > 0 ? `, ${overdueTRY.toLocaleString("tr-TR")} TRY` : ""}${overdueEUR > 0 ? `, ${overdueEUR.toLocaleString("tr-TR")} EUR` : ""}
Bekleyen görev: ${bekleyenGorev.length}
En aktif firma: ${enAktifFirma?.name || "—"} (${firmaIcerikSayisi[enAktifId] || 0} içerik)
İçerik üretilmeyen firma sayısı: ${firmasizIcerik}`;
}

function isReportRequest(message) {
  const m = (message || "").toLowerCase();
  return RAPOR_TRIGGER_KELIMELERI.some(k => m.includes(k));
}

function extractJSON(text) {
  if (!text) return null;
  // ```json ... ``` veya ``` ... ``` temizle
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  // İlk { ile son } arasını al
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  const slice = cleaned.slice(first, last + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

async function executeAction(action) {
  const d = action?.data || {};
  switch (action?.type) {
    case "create_content_idea": {
      const created = await base44.entities.ContentIdea.create({
        title: d.title || "Yeni İçerik",
        company_id: d.company_id || "",
        company_name: d.company_name || "",
        platform: d.platform || "instagram_post",
        topic: d.topic || d.title || "",
        caption: d.caption || "",
        hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
        scheduled_date: d.scheduled_date || new Date().toISOString().split("T")[0],
        content_pillar: d.content_pillar || null,
        approval_mode: "manual_internal",
        approval_status: "pending_internal",
        work_status: "not_started",
      });
      return { type: "ContentIdea", title: d.title, id: created?.id, icon: "📅" };
    }
    case "create_task": {
      const created = await base44.entities.Task.create({
        title: d.title || "Yeni Görev",
        description: d.description || "",
        due_date: d.due_date || null,
        priority: d.priority || "medium",
        company_id: d.company_id || "",
        status: "todo",
      });
      return { type: "Task", title: d.title, id: created?.id, icon: "✅" };
    }
    case "create_notification": {
      const created = await base44.entities.Notification.create({
        title: d.title || "Hatırlatma",
        message: d.message || "",
        severity: d.severity || "info",
        send_at: d.send_at || null,
        channels: Array.isArray(d.channels) ? d.channels : ["in_app"],
        related_entity_type: d.related_entity_type || "",
        related_entity_id: d.related_entity_id || "",
        read: false,
      });
      return { type: "Notification", title: d.title, id: created?.id, icon: "🔔" };
    }
    case "create_publish_schedule": {
      const created = await base44.entities.PublishSchedule.create({
        company_id: d.company_id || "",
        company_name: d.company_name || "",
        platform: d.platform || "instagram_post",
        scheduled_at: d.scheduled_at || new Date().toISOString(),
        caption: d.caption || "",
        status: "scheduled",
        publish_type: "manual",
      });
      return { type: "PublishSchedule", title: `${d.platform} paylaşımı`, id: created?.id, icon: "🚀" };
    }
    case "create_outbound_lead": {
      const created = await base44.entities.OutboundLead.create({
        company_name: d.company_name || "Yeni Lead",
        contact_person: d.contact_person || "",
        email: d.email || "",
        phone: d.phone || "",
        status: d.status || "cold",
        source: "manuel",
      });
      return { type: "OutboundLead", title: d.company_name, id: created?.id, icon: "🎯" };
    }
    // GELİŞTİRİCİ AKSİYONLARI
    case "query_data": {
      const Entity = base44.entities[d.entity];
      if (!Entity) return { type: "query_data", title: d.entity, error: "Entity bulunamadı", icon: "❓" };
      const rows = await Entity.filter(d.filter || {}, "-created_date", d.limit || 20).catch(() => []);
      const preview = rows.slice(0, 5).map(r => r.title || r.name || r.id).join(", ");
      return { type: "query_data", title: `${d.entity}: ${rows.length} kayıt${preview ? " — " + preview : ""}`, icon: "🔎", data: rows };
    }
    case "fix_stuck_projects": {
      const stuck = await base44.entities.WebsiteProject.filter({ generation_status: "generating" }).catch(() => []);
      let fixed = 0;
      for (const p of stuck) {
        const gecenMs = Date.now() - new Date(p.updated_date).getTime();
        if (gecenMs > 3 * 60 * 1000) {
          await base44.entities.WebsiteProject.update(p.id, { generation_status: "idle" }).catch(() => {});
          fixed++;
        }
      }
      return { type: "fix_stuck_projects", title: `${fixed} takılı proje sıfırlandı`, icon: "🔧" };
    }
    case "system_status": {
      const summary = await buildSystemStatus();
      return { type: "system_status", title: "Sistem özeti", icon: "📊", data: summary };
    }
    case "test_ai_connection": {
      try {
        const res = await base44.functions.invoke("aiInvoke", {
          task_type: "chat_simple",
          prompt: "Sadece 'OK' yaz",
          system_prompt: "Tek kelime yanıt ver.",
          skip_cache: true,
        });
        const ok = (res?.data?.result || res?.result || "").toLowerCase().includes("ok");
        return { type: "test_ai_connection", title: ok ? "AI bağlantısı: ✅ Çalışıyor" : "AI bağlantısı: ⚠️ Şüpheli yanıt", icon: ok ? "✅" : "⚠️" };
      } catch (e) {
        return { type: "test_ai_connection", title: "AI bağlantısı başarısız", error: e.message, icon: "❌" };
      }
    }
    case "show_schema": {
      try {
        const schema = await base44.entities[d.entityName]?.schema?.();
        const fields = schema?.properties ? Object.keys(schema.properties) : [];
        return { type: "show_schema", title: `${d.entityName}: ${fields.length} alan`, icon: "📋", data: { fields, schema } };
      } catch (e) {
        return { type: "show_schema", title: d.entityName, error: e.message, icon: "❌" };
      }
    }
    default:
      return { type: action?.type || "unknown", title: "?", error: "Bilinmeyen aksiyon tipi", icon: "❓" };
  }
}

// Sistem genel durumu
async function buildSystemStatus() {
  const [firmalar, icerikler, faturalar, projeler, gorevler] = await Promise.all([
    base44.entities.Company.filter({ deleted: false, status: "active" }).catch(() => []),
    base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 100).catch(() => []),
    base44.entities.Invoice.list("-created_date", 50).catch(() => []),
    base44.entities.WebsiteProject.list("-created_date", 50).catch(() => []),
    base44.entities.Task.filter({ deleted: false }, "-created_date", 30).catch(() => []),
  ]);
  const buayBaslangic = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const buayIcerik = icerikler.filter(i => i.created_date >= buayBaslangic);
  const overdue = faturalar.filter(f => f.status === "overdue");
  const takiliProje = projeler.filter(p => {
    if (p.generation_status !== "generating") return false;
    return Date.now() - new Date(p.updated_date).getTime() > 3 * 60 * 1000;
  });
  const hataliProje = projeler.filter(p => p.generation_status === "error");
  const bekleyenGorev = gorevler.filter(t => t.status !== "done");
  return {
    aktifFirma: firmalar.length,
    buayIcerik: buayIcerik.length,
    overdueFatura: overdue.length,
    bekleyenGorev: bekleyenGorev.length,
    takiliProje: takiliProje.length,
    hataliProje: hataliProje.length,
    toplamProje: projeler.length,
  };
}

// SLASH KOMUTLAR — direkt çalıştır, LLM'e gitme
async function handleSlashCommand(cmd) {
  const text = cmd.trim().toLowerCase();

  if (text === "/status") {
    const s = await buildSystemStatus();
    const msg = `📊 **Sistem Durumu**
• Aktif firma: ${s.aktifFirma}
• Bu ay içerik: ${s.buayIcerik}
• Bekleyen görev: ${s.bekleyenGorev}
• Overdue fatura: ${s.overdueFatura}
• Web proje: ${s.toplamProje} (takılı: ${s.takiliProje}, hatalı: ${s.hataliProje})`;
    return { message: msg, executedActions: [{ type: "system_status", title: "Durum çekildi", icon: "📊" }] };
  }

  if (text === "/fix web projesi" || text === "/fix web" || text === "/fix") {
    const stuck = await base44.entities.WebsiteProject.filter({ generation_status: "generating" }).catch(() => []);
    let fixed = 0;
    const names = [];
    for (const p of stuck) {
      const gecenMs = Date.now() - new Date(p.updated_date).getTime();
      if (gecenMs > 3 * 60 * 1000) {
        await base44.entities.WebsiteProject.update(p.id, { generation_status: "idle" }).catch(() => {});
        fixed++;
        names.push(p.project_name || p.id);
      }
    }
    return {
      message: fixed > 0
        ? `🔧 ${fixed} takılı proje sıfırlandı:\n${names.map(n => "• " + n).join("\n")}`
        : "✅ Takılı proje yok — her şey yolunda.",
      executedActions: [{ type: "fix_stuck_projects", title: `${fixed} proje sıfırlandı`, icon: "🔧" }],
    };
  }

  if (text === "/ai test") {
    try {
      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "chat_simple",
        prompt: "Sadece 'OK' yaz",
        system_prompt: "Tek kelime yanıt ver.",
        skip_cache: true,
      });
      const out = (res?.data?.result || res?.result || "").trim();
      const ok = out.toLowerCase().includes("ok");
      return {
        message: ok
          ? `✅ AI bağlantısı çalışıyor.\nYanıt: "${out}"\nModel: ${res?.data?.model_used || "—"}`
          : `⚠️ AI yanıt verdi ama beklenmedik: "${out}"`,
        executedActions: [{ type: "test_ai_connection", title: ok ? "✅ AI OK" : "⚠️ Şüpheli", icon: ok ? "✅" : "⚠️" }],
      };
    } catch (e) {
      return {
        message: `❌ AI bağlantısı başarısız: ${e.message}`,
        executedActions: [{ type: "test_ai_connection", title: "Bağlantı hatası", error: e.message, icon: "❌" }],
      };
    }
  }

  if (text.startsWith("/schema ")) {
    const entityName = cmd.trim().slice(8).trim();
    try {
      const schema = await base44.entities[entityName]?.schema?.();
      if (!schema) return { message: `❌ "${entityName}" entity bulunamadı.`, executedActions: [] };
      const fields = Object.entries(schema.properties || {})
        .map(([k, v]) => `• **${k}**: ${v.type}${v.enum ? ` (${v.enum.join("|")})` : ""}${v.default !== undefined ? ` [default: ${JSON.stringify(v.default)}]` : ""}`)
        .join("\n");
      return {
        message: `📋 **${entityName}** şeması (${Object.keys(schema.properties || {}).length} alan):\n${fields}`,
        executedActions: [{ type: "show_schema", title: entityName, icon: "📋" }],
      };
    } catch (e) {
      return { message: `❌ Hata: ${e.message}`, executedActions: [] };
    }
  }

  if (text.startsWith("/debug ")) {
    const sayfa = cmd.trim().slice(7).trim().toLowerCase();
    const logs = await base44.entities.AgentWorkflowLog.filter({}, "-created_date", 30).catch(() => []);
    const ilgili = logs.filter(l =>
      (l.related_entity_type || "").toLowerCase().includes(sayfa) ||
      (l.error_message || "").toLowerCase().includes(sayfa) ||
      (l.agent_role || "").toLowerCase().includes(sayfa)
    );
    const errors = ilgili.filter(l => l.status === "failed" || l.error_message);
    if (errors.length === 0) {
      return {
        message: `✅ "${sayfa}" ile ilgili son 30 kayıtta hata bulunamadı.`,
        executedActions: [{ type: "query_data", title: `${ilgili.length} log incelendi`, icon: "🔎" }],
      };
    }
    const summary = errors.slice(0, 5).map(e =>
      `• [${e.agent_role}] ${e.error_message || e.decision || "—"}`
    ).join("\n");
    return {
      message: `🐛 **"${sayfa}" için son hatalar (${errors.length}):**\n${summary}`,
      executedActions: [{ type: "query_data", title: `${errors.length} hata bulundu`, icon: "🐛" }],
    };
  }

  return null; // slash değil
}

export async function processAssistantMessage({ userMessage, history = [], companies = [] }) {
  // SLASH KOMUTLAR — direkt çalıştır, LLM'e gitme
  if (userMessage?.trim().startsWith("/")) {
    const slashResult = await handleSlashCommand(userMessage);
    if (slashResult) {
      return {
        message: slashResult.message,
        executedActions: slashResult.executedActions || [],
        needsConfirmation: false,
        confirmationText: "",
        pendingActions: [],
        modelUsed: "slash-command",
      };
    }
  }

  const { hasAction, hasDelete } = detectIntent(userMessage);
  const isReport = isReportRequest(userMessage);

  // DÜZELTME 2: Kısa system prompt — token tasarrufu (500 hatası kök neden)
  let systemPrompt = buildShortAssistantPrompt({ companies });

  // KATMAN 7: Doğal Dil Raporlama — metrikleri context'e ekle (yine kısa tut)
  if (isReport) {
    try {
      const metrikler = await buildReportMetrics();
      systemPrompt += `\n\nGÜNCEL METRİKLER (kısa anlat, liste yapma):\n${metrikler}`;
    } catch (e) {
      console.warn("Rapor metrikleri çekilemedi", e?.message);
    }
  }

  // DÜZELTME 1: Konuşma geçmişini sınırla — son 6 mesaj, her biri 300 karakter
  const histStr = (history || [])
    .slice(-6)
    .map(m => {
      const c = typeof m.content === "string" ? m.content : String(m.content || "");
      return `${m.role === "user" ? "K" : "A"}: ${c.substring(0, 300)}`;
    })
    .join("\n");

  const actionInstruction = hasDelete
    ? "\nSilme istiyor → needs_confirmation:true, actions boş."
    : hasAction
      ? "\nAksiyon istiyor → actions dizisini doldur, needs_confirmation:false."
      : "\nBilgi sorusu veya belirsiz. Aksiyon imâ ediliyorsa needs_confirmation:true.";

  const prompt = `GEÇMİŞ:
${histStr || "(yeni)"}

MESAJ: ${userMessage}${actionInstruction}

JSON: {"message":"...","actions":[],"needs_confirmation":false,"confirmation_text":""}`;

  // aiInvoke backend'i — kullanıcının kendi API key'i kullanılır, Base44 kredisi harcanmaz
  // DÜZELTME 3: max_tokens=500 (nepa_assistant task type'ı zaten 500'e ayarlı)
  const res = await base44.functions.invoke("aiInvoke", {
    task_type: "nepa_assistant",
    system_prompt: systemPrompt,
    prompt,
    json_mode: true,
    skip_cache: true,
    max_tokens: 500,
  });

  const data = res.data || res;
  if (data?.error) throw new Error(data.error);

  const responseText = data?.result || "";

  // DÜZELTME 4: JSON parse hatası yakalanınca düz metin kullan — hata fırlatma
  let parsed = extractJSON(responseText);
  if (!parsed) {
    const plainText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    parsed = {
      message: plainText || "Anladım.",
      actions: [],
      needs_confirmation: false,
    };
  }

  // Aksiyonları çalıştır
  const executedActions = [];
  if (Array.isArray(parsed.actions) && parsed.actions.length > 0 && !parsed.needs_confirmation) {
    for (const action of parsed.actions) {
      try {
        const log = await executeAction(action);
        executedActions.push(log);
      } catch (e) {
        executedActions.push({
          type: action?.type || "unknown",
          title: action?.data?.title || "?",
          error: e?.message || String(e),
          icon: "❌",
        });
      }
    }
  }

  return {
    message: parsed.message || "",
    executedActions,
    needsConfirmation: !!parsed.needs_confirmation,
    confirmationText: parsed.confirmation_text || "",
    pendingActions: parsed.needs_confirmation ? (parsed.actions || []) : [],
    modelUsed: data?.model_used || "",
  };
}

export async function executePendingActions(actions = []) {
  const results = [];
  for (const action of actions) {
    try {
      results.push(await executeAction(action));
    } catch (e) {
      results.push({
        type: action?.type || "unknown",
        title: action?.data?.title || "?",
        error: e?.message || String(e),
        icon: "❌",
      });
    }
  }
  return results;
}