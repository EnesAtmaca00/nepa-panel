// DEPRECATED — Bu dosya kaldirildı.
// runMedicationReminders.ts ile tamamen degistirildi.
//
// Sorunlar:
// 1. import base44 from '../../api/base44Client' => Deno backend'de calismaz (frontend path)
// 2. medication.telegram_chat_id kullaniyor => mevcut mimari AppSettings'ten okuyor
// 3. base44.functions.sendTelegramReminder cagiriyor => eski API
// 4. WhatsApp destegi yok, service role (asServiceRole) yok

Deno.serve(async (_req) => {
    return Response.json(
          { error: "deprecated", message: "Bu fonksiyon kaldirildi. runMedicationReminders kullanin." },
              { status: 410 }
    );
});
