// Müşteri onayına gönderilen içerik için e-posta gönder
// Entity automation: ClientApproval — create eventi
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const approval = body.data;
    if (!approval?.id) return Response.json({ skipped: "no approval data" });

    // İlgili içerik fikrini al
    const ideas = await base44.asServiceRole.entities.ContentIdea.filter({ id: approval.content_idea_id });
    const idea = ideas[0];
    if (!idea) return Response.json({ skipped: "content idea not found" });

    // Firma e-postasını al
    const companies = await base44.asServiceRole.entities.Company.filter({ id: approval.company_id });
    const company = companies[0];
    if (!company?.email) return Response.json({ skipped: "no company email" });

    // Onay linki — public token ile
    const approvalUrl = `${Deno.env.get("VITE_APP_URL") || "https://ajanspro.base44.app"}/onay/${approval.public_token}`;

    const subject = `İçerik Onayı Bekleniyor — ${idea.title}`;
    const body_text = `Sayın ${company.contact_person || approval.company_name},

Aşağıdaki içerik sizin onayınıza sunulmuştur. Lütfen inceleyerek geri bildirim sağlayın.

📝 İçerik Detayı
━━━━━━━━━━━━━━
Başlık    : ${idea.title}
Platform  : ${idea.platform || "-"}
Tarih     : ${idea.scheduled_date || "-"}

${idea.caption ? `Metin Taslağı:\n"${idea.caption.slice(0, 300)}${idea.caption.length > 300 ? "..." : ""}"\n` : ""}
🔗 Onay / Revizyon için tıklayın:
${approvalUrl}

Teşekkürler,
AjansPro Ekibi`;

    // KREDİ TASARRUFU: Core.SendEmail devre dışı (Base44 kredisi yakar).
    // Onay linkini in-app Notification olarak göster — manuel paylaşılır.
    await base44.asServiceRole.entities.Notification.create({
      type: "client_approval_pending",
      company_id: approval.company_id,
      severity: "info",
      title: `Müşteri onayı oluşturuldu: ${idea.title}`,
      message: `Onay linki: ${approvalUrl}\n\nLink panele kopyalandı, müşteriye manuel iletin.`,
      channels: ["in_app"],
      read: false,
      send_at: new Date().toISOString(),
    }).catch(() => {});

    console.log(`[KREDİ TASARRUFU] Mail atlandı, in-app bildirim: ${approval.id}`);
    return Response.json({ success: true, to: company.email, mode: "in_app_only", approval_url: approvalUrl });
  } catch (error) {
    console.error("notifyClientApproval error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});