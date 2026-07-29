// Ne-Pa Asistan — Telegram Webhook
// Telegram'dan gelen mesajları AI asistana yönlendirir ve cevabı geri gönderir.
// Webhook URL'sini @BotFather'dan aldığın token ile Telegram'a kaydet:
//   https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://app.base44.com/api/apps/{appId}/functions/telegramAssistantWebhook
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACTION_KEYWORDS = ["ekle", "oluştur", "olustur", "kaydet", "yap", "planla", "ayarla", "hatırlat", "hatirlat", "koy", "ata", "yaz", "yarat"];
const DELETE_KEYWORDS = ["sil", "kaldır", "kaldir", "iptal et", "iptal", "geri al"];

function detectIntent(message) {
  const m = (message || "").toLowerCase();
  return {
    hasAction: ACTION_KEYWORDS.some(k => m.includes(k)),
    hasDelete: DELETE_KEYWORDS.some(k => m.includes(k)),
  };
}

function extractJSON(text) {
  if (!text) return null;
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { return null; }
}

function buildSystemPrompt(companies) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("tr-TR");
  const isoToday = today.toISOString().split("T")[0];
  const companyList = (companies || []).slice(0, 15)
    .map(c => `- ${c.name} (${c.sector || "—"}, id: ${c.id})`).join("\n") || "(yok)";

  return `Sen Ne-Pa Panel'in AI asistanısın. Bir dijital ajans yönetim sistemidir.

AKSİYON TİPLERİ:
- create_content_idea: {title, company_id, platform, scheduled_date, caption, hashtags, content_pillar, topic}
- create_task: {title, description, due_date, priority, company_id}
- create_notification: {title, message, severity, send_at, channels}
- create_publish_schedule: {company_id, platform, scheduled_at, caption}
- create_outbound_lead: {company_name, contact_person, email, status}

KARAR KURALI:
- Mesajda "ekle/oluştur/yap/planla/ayarla/hatırlat" varsa direkt actions doldur.
- "sil/iptal/kaldır" varsa needs_confirmation: true yap.

SADECE şu JSON formatında yanıtla (markdown YOK):
{"message": "kısa Türkçe metin", "actions": [...], "needs_confirmation": false, "confirmation_text": ""}

Bugün: ${todayStr} (ISO: ${isoToday})

AKTİF FİRMALAR:
${companyList}`;
}

async function executeAction(base44, action) {
  const d = action?.data || {};
  switch (action?.type) {
    case "create_content_idea": {
      const created = await base44.asServiceRole.entities.ContentIdea.create({
        title: d.title || "Yeni İçerik",
        company_id: d.company_id || "",
        company_name: d.company_name || "",
        platform: d.platform || "instagram_post",
        topic: d.topic || d.title || "",
        caption: d.caption || "",
        hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
        scheduled_date: d.scheduled_date || new Date().toISOString().split("T")[0],
        content_pillar: d.content_pillar || null,
        approval_status: "pending_internal",
        work_status: "not_started",
      });
      return { type: "İçerik", title: d.title, icon: "📅", id: created?.id };
    }
    case "create_task": {
      const created = await base44.asServiceRole.entities.Task.create({
        title: d.title || "Yeni Görev",
        description: d.description || "",
        due_date: d.due_date || null,
        priority: d.priority || "medium",
        company_id: d.company_id || "",
        status: "todo",
      });
      return { type: "Görev", title: d.title, icon: "✅", id: created?.id };
    }
    case "create_notification": {
      const created = await base44.asServiceRole.entities.Notification.create({
        title: d.title || "Hatırlatma",
        message: d.message || "",
        severity: d.severity || "info",
        send_at: d.send_at || null,
        channels: Array.isArray(d.channels) ? d.channels : ["in_app"],
        read: false,
      });
      return { type: "Hatırlatma", title: d.title, icon: "🔔", id: created?.id };
    }
    case "create_publish_schedule": {
      const created = await base44.asServiceRole.entities.PublishSchedule.create({
        company_id: d.company_id || "",
        company_name: d.company_name || "",
        platform: d.platform || "instagram_post",
        scheduled_at: d.scheduled_at || new Date().toISOString(),
        caption: d.caption || "",
        status: "scheduled",
        publish_type: "manual",
      });
      return { type: "Yayın", title: `${d.platform}`, icon: "🚀", id: created?.id };
    }
    case "create_outbound_lead": {
      const created = await base44.asServiceRole.entities.OutboundLead.create({
        company_name: d.company_name || "Yeni Lead",
        contact_person: d.contact_person || "",
        email: d.email || "",
        status: d.status || "cold",
        source: "manuel",
      });
      return { type: "Lead", title: d.company_name, icon: "🎯", id: created?.id };
    }
    default:
      return { type: action?.type || "?", title: "?", icon: "❓", error: "Bilinmeyen aksiyon" };
  }
}

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (e) {
    console.error("Telegram send failed", e);
  }
}

Deno.serve(async (req) => {
  try {
    // Telegram webhook için auth gerekli değil — public endpoint
    const base44 = createClientFromRequest(req);

    const update = await req.json();
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      return Response.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const userText = message.text.trim();
    const firstName = message.from?.first_name || "Kullanıcı";

    // Settings — telegram_enabled kontrolü ve token
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList?.[0] || {};
    const token = settings.telegram_bot_token;

    if (!settings.telegram_enabled || !token) {
      console.warn("Telegram webhook: bot devre dışı veya token yok");
      return Response.json({ ok: true });
    }

    // Session bul veya oluştur
    let session;
    const existing = await base44.asServiceRole.entities.AIChatSession.filter(
      { channel: "telegram", telegram_chat_id: chatId }, "-last_message_at", 1
    );
    if (existing?.[0]) {
      session = existing[0];
    } else {
      session = await base44.asServiceRole.entities.AIChatSession.create({
        channel: "telegram",
        telegram_chat_id: chatId,
        messages: [],
        last_message_at: new Date().toISOString(),
        message_count: 0,
        title: `Telegram · ${firstName}`,
      });
    }

    const history = (session.messages || []).slice(-20);
    const userMessage = { role: "user", content: userText, timestamp: new Date().toISOString() };
    const updatedHistory = [...history, userMessage];

    // AI çağrısı
    const companies = await base44.asServiceRole.entities.Company.filter(
      { deleted: false, status: "active" }, "-updated_date", 30
    );
    const { hasAction, hasDelete } = detectIntent(userText);
    const systemPrompt = buildSystemPrompt(companies);
    const histStr = updatedHistory.slice(-20)
      .map(m => `${m.role === "user" ? "Kullanıcı" : "Asistan"}: ${m.content}`).join("\n");
    const actionInstruction = hasDelete
      ? "\nSilme isteği — needs_confirmation: true."
      : hasAction
        ? "\nAksiyon isteği — actions dizisini doldur."
        : "\nBilgi sorusu olabilir, gerekirse needs_confirmation: true.";
    const prompt = `GEÇMİŞ:\n${histStr}\n\nKULLANICI: ${userText}${actionInstruction}\n\nSADECE JSON döndür.`;

    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "chat_complex",
      system_prompt: systemPrompt,
      prompt,
      json_mode: true,
      skip_cache: true,
    });
    const aiData = aiRes.data || aiRes;
    if (aiData?.error) {
      await sendTelegramMessage(token, chatId, `❌ Hata: ${aiData.error}`);
      return Response.json({ ok: true });
    }

    const parsed = extractJSON(aiData.result) || { message: aiData.result || "Bir şey ters gitti.", actions: [], needs_confirmation: false };

    // Aksiyonları çalıştır
    const executed = [];
    if (Array.isArray(parsed.actions) && parsed.actions.length > 0 && !parsed.needs_confirmation) {
      for (const action of parsed.actions) {
        try {
          executed.push(await executeAction(base44, action));
        } catch (e) {
          executed.push({ type: action?.type || "?", title: action?.data?.title || "?", icon: "❌", error: e.message });
        }
      }
    }

    // Telegram cevabı oluştur
    let replyText = parsed.message || "";
    if (executed.length > 0) {
      replyText += "\n\n---\n✅ *Yapıldı:*\n" + executed.map(a =>
        a.error ? `• ${a.icon} ${a.type}: ${a.title} _(hata: ${a.error})_` : `• ${a.icon} *${a.type}:* ${a.title}`
      ).join("\n");
    }
    if (parsed.needs_confirmation && parsed.confirmation_text) {
      replyText += `\n\n⚠️ ${parsed.confirmation_text}\n\nOnaylamak için cevap olarak *evet* yaz, iptal için *hayır* yaz.`;
    }

    await sendTelegramMessage(token, chatId, replyText);

    // Session güncelle
    const assistantMessage = {
      role: "assistant",
      content: parsed.message || "",
      timestamp: new Date().toISOString(),
      actions: executed,
      needsConfirmation: !!parsed.needs_confirmation,
    };
    const finalMessages = [...updatedHistory, assistantMessage].slice(-100);
    const firstUserMsg = finalMessages.find(m => m.role === "user");
    await base44.asServiceRole.entities.AIChatSession.update(session.id, {
      messages: finalMessages,
      last_message_at: new Date().toISOString(),
      message_count: finalMessages.length,
      title: session.title || `Telegram · ${firstName}: ${firstUserMsg?.content?.substring(0, 40) || ""}`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("telegramAssistantWebhook error:", error);
    return Response.json({ ok: false, error: error.message });
  }
});