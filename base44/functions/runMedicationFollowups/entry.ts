// AjansPro — İlaç Takip (her 10 dakikada)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendWhatsApp(phone, apikey, message) {
  const encoded = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apikey}`;
  return fetch(url);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0] || {};

    const hasWhatsApp = settings.medication_whatsapp_enabled && settings.medication_patient_whatsapp_number && settings.medication_whatsapp_apikey;
    const hasTelegram = settings.telegram_enabled && settings.telegram_bot_token;

    if (!hasWhatsApp && !hasTelegram) {
      return Response.json({ skipped: "no notification channel configured" });
    }

    const snoozeMinutes = settings.medication_snooze_minutes || 30;
    const maxReminders = settings.medication_max_reminders || 3;
    const now = new Date();
    // Türkiye saatiyle bugünün tarihini hesapla
    const tz = settings.medication_timezone || "Europe/Paris";
    const localNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const todayDate = `${localNow.getFullYear()}-${String(localNow.getMonth()+1).padStart(2,"0")}-${String(localNow.getDate()).padStart(2,"0")}`;

    const reminderDoses = await base44.asServiceRole.entities.MedicationDose.filter({
      scheduled_date: todayDate,
      status: { $in: ["reminded", "snoozed"] },
    }, "scheduled_time", 100);

    let processed = 0;

    for (const dose of reminderDoses) {
      const lastReminder = dose.last_reminder_at ? new Date(dose.last_reminder_at) : null;
      const minutesSince = lastReminder ? (now - lastReminder) / 60000 : 999;

      if (minutesSince < snoozeMinutes) continue;

      if ((dose.reminder_count || 0) >= maxReminders) {
        await base44.asServiceRole.entities.MedicationDose.update(dose.id, { status: "missed" });

        if (settings.medication_owner_user_id) {
          await base44.asServiceRole.entities.Notification.create({
            type: "medication_missed",
            severity: "warning",
            title: `${settings.medication_patient_name || "Hasta"} - ${dose.medication_name} alınmadı`,
            message: `${dose.scheduled_time} dozu kaçırıldı.`,
            channels: ["in_app"],
            read: false,
          });
        }
        processed++;
        continue;
      }

      // Tekrar hatırlat
      const patientName = settings.medication_patient_name || "";
      const template = settings.medication_followup_template || "💊 Hatırlatma!\n\n{isim}, {ilac} hâlâ bekleniyor.\nSaat {saat}'de alınması gerekiyordu.";
      const plainText = template
        .replace(/{isim}/g, patientName)
        .replace(/{saat}/g, dose.scheduled_time)
        .replace(/{ilac}/g, dose.medication_name);

      let notified = false;

      if (hasWhatsApp) {
        const wpRes = await sendWhatsApp(
          settings.medication_patient_whatsapp_number,
          settings.medication_whatsapp_apikey,
          plainText
        );
        if (wpRes.ok) notified = true;
      }

      if (hasTelegram) {
        const chatId = settings.medication_patient_telegram_chat_id;
        if (chatId) {
          const markdownText = `💊 *Hatırlatma*\n\n${patientName}, *${dose.medication_name}* hâlâ bekleniyor.\n\nSaat ${dose.scheduled_time}'de alınması gerekiyordu.`;
          const keyboard = {
            inline_keyboard: [[
              { text: "✅ İçtim", callback_data: `taken_${dose.id}` },
              { text: "⏰ 15 dk sonra", callback_data: `snooze_${dose.id}_15` },
              { text: "❌ İçemedim", callback_data: `missed_${dose.id}` },
            ]]
          };
          const tgRes = await fetch(
            `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: markdownText, parse_mode: "Markdown", reply_markup: keyboard }),
            }
          );
          if (tgRes.ok) notified = true;
        }
      }

      if (notified) {
        await base44.asServiceRole.entities.MedicationDose.update(dose.id, {
          reminder_count: (dose.reminder_count || 0) + 1,
          last_reminder_at: now.toISOString(),
          status: "reminded",
        });
        await base44.asServiceRole.entities.MedicationConversation.create({
          medication_id: dose.medication_id,
          dose_id: dose.id,
          direction: "outgoing",
          message: plainText,
          sent_at: now.toISOString(),
        });
        processed++;
      }
    }

    return Response.json({ success: true, processed });
  } catch (error) {
    console.error("runMedicationFollowups error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});