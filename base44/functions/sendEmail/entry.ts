import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, body, thread_id } = await req.json();

    // KREDİ TASARRUFU: Base44 SendEmail kullanılmaz.
    // Gmail send izni verilmediği için dış mail yerine in-app bildirim oluşturulur.
    await base44.asServiceRole.entities.Notification.create({
      type: "email_skipped",
      title: subject || "E-posta hazırlanmış",
      message: `Alıcı: ${to || "-"}\n\n${String(body || "").replace(/<[^>]+>/g, " ").slice(0, 500)}`,
      severity: "info",
      channels: ["in_app"],
      read: false,
      related_entity_type: thread_id ? "EmailThread" : "",
      related_entity_id: thread_id || "",
      send_at: new Date().toISOString(),
    });

    if (thread_id) {
      await base44.asServiceRole.entities.EmailThread.update(thread_id, { reply_sent: false });
    }

    return Response.json({ success: true, mode: "in_app_only", skipped_email: true });
  } catch (error) {
    console.error("sendEmail error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});