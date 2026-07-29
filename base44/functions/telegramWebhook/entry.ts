// DEPRECATED — Bu dosya kaldirildi.
// medicationTelegramWebhook.ts ile tamamen degistirildi.
//
// Sorunlar:
// 1. import { base44 } from '../../api/base44Client' => Deno backend'de calismaz
// 2. export default async function => Deno.serve() wrapper eksik
// 3. base44.entities.MedicationDose.update => asServiceRole yok, RLS bypass edilemiyor
// 4. Sadece callback_query isliyor; medicationTelegramWebhook hem text hem callback isliyor

Deno.serve(async (_req) => {
    return Response.json(
          { error: "deprecated", message: "Bu fonksiyon kaldirildi. medicationTelegramWebhook kullanin." },
              { status: 410 }
    );
});
