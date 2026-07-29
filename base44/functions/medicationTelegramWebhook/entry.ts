// AjansPro — İlaç Telegram Webhook İşleyici
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function interpretResponse(text) {
  const lower = text.toLowerCase().trim();
  const TAKEN = ["içtim", "aldım", "yedim", "tamam", "ok", "evet", "bitti", "✓", "aldim", "ictim"];
  const NOT_TAKEN = ["içmedim", "almadım", "yok", "hayır", "olmaz", "icmedim", "almadim", "hayir"];
  const LATER = ["sonra", "az sonra", "biraz", "later", "bekle"];
  const minMatch = lower.match(/(\d+)\s*(dk|dakika|min)/);

  if (TAKEN.some(w => lower.includes(w))) return { type: "taken" };
  if (NOT_TAKEN.some(w => lower.includes(w))) return { type: "not_taken" };
  if (minMatch) return { type: "later", minutes: parseInt(minMatch[1]) };
  if (LATER.some(w => lower.includes(w))) return { type: "later", minutes: 15 };
  return { type: "unclear" };
}

async function sendReply(token, chatId, text, keyboard) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown" };
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const update = await req.json();

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0] || {};
    const token = settings.telegram_bot_token;
    if (!token) return Response.json({ ok: true });

    const now = new Date();
    const patientChatId = settings.medication_patient_telegram_chat_id;

    // Callback query (buton tıklaması)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || "";
      const chatId = String(cq.message.chat.id);

      // Callback ack
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cq.id }),
      });

      if (data.startsWith("taken_")) {
        const doseId = data.replace("taken_", "");
        await base44.asServiceRole.entities.MedicationDose.update(doseId, {
          status: "taken",
          taken_at: now.toISOString(),
        });
        await sendReply(token, chatId, "✅ Süpersin, kaydedildi! 💪");

      } else if (data.startsWith("snooze_")) {
        const parts = data.split("_");
        const doseId = parts[1];
        const minutes = parseInt(parts[2]) || 15;
        const newTime = new Date(now.getTime() + minutes * 60000).toISOString();
        await base44.asServiceRole.entities.MedicationDose.update(doseId, {
          status: "snoozed",
          scheduled_at: newTime,
          last_reminder_at: now.toISOString(),
        });
        await sendReply(token, chatId, `⏰ Tamam, ${minutes} dakika sonra hatırlatacağım.`);

      } else if (data.startsWith("missed_")) {
        const doseId = data.replace("missed_", "");
        await base44.asServiceRole.entities.MedicationDose.update(doseId, { status: "missed" });
        await sendReply(token, chatId, "Tamam, kaydedildi 💛 Bir dahaki sefere!");

        if (settings.medication_owner_user_id) {
          const doses = await base44.asServiceRole.entities.MedicationDose.filter({ id: doseId });
          const dose = doses[0];
          if (dose) {
            await base44.asServiceRole.entities.Notification.create({
              type: "medication_missed",
              severity: "warning",
              title: `${settings.medication_patient_name || "Hasta"} - ${dose.medication_name} alınmadı`,
              message: `${dose.scheduled_time} dozu alınmadı.`,
              channels: ["in_app"],
              read: false,
            });
          }
        }
      }
      return Response.json({ ok: true });
    }

    // Yazılı mesaj
    if (update.message?.text) {
      const msgChatId = String(update.message.chat.id);
      const text = update.message.text;

      // Sadece hasta mesajlarına yanıt ver
      if (msgChatId !== patientChatId) {
        return Response.json({ ok: true });
      }

      // Son 30 dakikadaki reminded/snoozed doz
      const todayDate = now.toISOString().split("T")[0];
      const recentDoses = await base44.asServiceRole.entities.MedicationDose.filter({
        scheduled_date: todayDate,
        status: { $in: ["reminded", "snoozed"] },
      }, "-last_reminder_at", 5);

      // Konuşmayı kaydet
      if (recentDoses.length > 0) {
        await base44.asServiceRole.entities.MedicationConversation.create({
          medication_id: recentDoses[0].medication_id,
          dose_id: recentDoses[0].id,
          direction: "incoming",
          message: text,
          sent_at: now.toISOString(),
        });
      }

      const interpretation = interpretResponse(text);

      if (interpretation.type === "taken" && recentDoses.length > 0) {
        await base44.asServiceRole.entities.MedicationDose.update(recentDoses[0].id, {
          status: "taken",
          taken_at: now.toISOString(),
          response_text: text,
          response_interpretation: "taken",
          response_received_at: now.toISOString(),
        });
        await sendReply(token, msgChatId, "✅ Harika! Kaydedildi 🌟");

      } else if (interpretation.type === "not_taken" && recentDoses.length > 0) {
        await base44.asServiceRole.entities.MedicationDose.update(recentDoses[0].id, {
          status: "missed",
          response_text: text,
          response_interpretation: "not_taken",
          response_received_at: now.toISOString(),
        });
        await sendReply(token, msgChatId, "Tamam, not aldım 💛");

      } else if (interpretation.type === "later" && recentDoses.length > 0) {
        const mins = interpretation.minutes || 15;
        const newTime = new Date(now.getTime() + mins * 60000).toISOString();
        await base44.asServiceRole.entities.MedicationDose.update(recentDoses[0].id, {
          status: "snoozed",
          scheduled_at: newTime,
          last_reminder_at: now.toISOString(),
          response_text: text,
          response_interpretation: "later",
        });
        await sendReply(token, msgChatId, `⏰ ${mins} dakika sonra tekrar hatırlatacağım.`);

      } else {
        // Anlaşılamadı
        const keyboard = {
          inline_keyboard: [[
            { text: "✅ İçtim", callback_data: `taken_${recentDoses[0]?.id || "unknown"}` },
            { text: "⏰ 15 dk sonra", callback_data: `snooze_${recentDoses[0]?.id || "unknown"}_15` },
            { text: "❌ İçemedim", callback_data: `missed_${recentDoses[0]?.id || "unknown"}` },
          ]]
        };
        await sendReply(token, msgChatId, "Anlayamadım, lütfen butonlardan birini seç 😊", recentDoses.length > 0 ? keyboard : null);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("medicationTelegramWebhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});