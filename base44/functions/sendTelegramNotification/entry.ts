// AjansPro — Telegram bildirim gönderici
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { title, message, severity } = body;

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0] || {};

    if (!settings.telegram_enabled || !settings.telegram_bot_token) {
      return Response.json({ skipped: "telegram disabled or no token" });
    }

    const chatIds = settings.telegram_chat_ids || [];
    if (chatIds.length === 0) {
      return Response.json({ skipped: "no chat_ids configured" });
    }

    const emojiMap = { info: "ℹ️", success: "✅", warning: "⚠️", critical: "🚨" };
    const emoji = emojiMap[severity] || "📢";
    const text = `${emoji} *${title}*\n\n${message}`;

    const results = [];
    for (const chatId of chatIds) {
      const res = await fetch(
        `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
        }
      );
      const data = await res.json();
      results.push({ chatId, ok: res.ok, response: data });
    }

    console.log(`Telegram notifications sent to ${results.length} chat(s)`);
    return Response.json({ sent: results.length, results });
  } catch (error) {
    console.error("sendTelegramNotification error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});