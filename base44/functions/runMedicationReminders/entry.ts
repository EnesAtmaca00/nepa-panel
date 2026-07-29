// AjansPro — İlaç Hatırlatıcı (her 5 dakikada)
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
    const hasTelegram = settings.telegram_enabled && settings.telegram_bot_token && settings.medication_patient_telegram_chat_id;

    if (!hasWhatsApp && !hasTelegram) {
      return Response.json({ skipped: "no notification channel configured" });
    }

    const now = new Date();
    const tz = settings.medication_timezone || "Europe/Paris";
    const localNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const localNowMinutes = localNow.getHours() * 60 + localNow.getMinutes();
    const todayDate = `${localNow.getFullYear()}-${String(localNow.getMonth()+1).padStart(2,"0")}-${String(localNow.getDate()).padStart(2,"0")}`;

    console.log(`Paris time: ${localNow.getHours()}:${String(localNow.getMinutes()).padStart(2,"0")}, nowMinutes: ${localNowMinutes}, todayDate: ${todayDate}`);

    const pendingDoses = await base44.asServiceRole.entities.MedicationDose.filter({
      scheduled_date: todayDate,
      status: "pending",
    }, "scheduled_time", 100);

    console.log(`pendingDoses: ${pendingDoses.length}`);

    let sent = 0;

    for (const dose of pendingDoses) {
      const [h, m] = dose.scheduled_time.split(":").map(Number);
      const scheduledMinutes = h * 60 + m;
      const diffMinutes = localNowMinutes - scheduledMinutes;
      console.log(`Dose: ${dose.scheduled_time}, diff: ${diffMinutes} min`);

      // Saatinde (±5 dakika tolerans) veya biraz geçmişse (max 10 dakika)
      if (diffMinutes >= -5 && diffMinutes <= 10) {
        const patientName = settings.medication_patient_name || "Sevgilim";
        const template = settings.medication_reminder_template || "💊 İlaç saati!\n\n{isim}, {saat} oldu.\n{ilac}";
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
          const wpBody = await wpRes.text();
          console.log(`WhatsApp: status=${wpRes.status}, body=${wpBody}`);
          if (wpRes.ok) notified = true;
        }

        if (hasTelegram) {
          const markdownText = `💊 *İlaç saati*\n\n${patientName}, ${dose.scheduled_time} oldu.\n\n*${dose.medication_name}*`;
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
              body: JSON.stringify({
                chat_id: settings.medication_patient_telegram_chat_id,
                text: markdownText,
                parse_mode: "Markdown",
                reply_markup: keyboard,
              }),
            }
          );
          if (tgRes.ok) notified = true;
        }

        if (notified) {
          await base44.asServiceRole.entities.MedicationDose.update(dose.id, {
            status: "reminded",
            reminder_count: (dose.reminder_count || 0) + 1,
            last_reminder_at: now.toISOString(),
          });
          await base44.asServiceRole.entities.MedicationConversation.create({
            medication_id: dose.medication_id,
            dose_id: dose.id,
            direction: "outgoing",
            message: plainText,
            sent_at: now.toISOString(),
          });
          sent++;
        }
      }
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error("runMedicationReminders error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});