import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { dose_id, medication_id, chat_id, message } = await req.json();
    
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const botToken = settings[0]?.telegram_bot_token;

    if (!botToken) throw new Error("Telegram bot token not configured");

    // Telegram API ile mesaj gönder
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat_id,
        text: message,
        reply_markup: {
          inline_keyboard: [[
            { text: "İçtim ✅", callback_data: `taken_${dose_id}` },
            { text: "İçmedim ❌", callback_data: `skipped_${dose_id}` }
          ]]
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }

    await base44.asServiceRole.entities.MedicationDose.update(dose_id, { reminder_sent: true });

    return Response.json({ success: true });
  } catch (error) {
    console.error("sendTelegramReminder error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
