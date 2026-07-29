// Fatura vadesi yaklaştığında müşteriye e-posta gönder
// Entity automation: Invoice — update eventi, due_date yaklaşanlar için
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function diffDays(dateStr) {
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / 86400000);
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY" }).format(amount);
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const invoice = body.data;
    if (!invoice || !invoice.id) return Response.json({ skipped: "no invoice data" });

    // Sadece pending/partial faturalar
    if (!["pending", "partial"].includes(invoice.status)) return Response.json({ skipped: "not pending" });

    const daysLeft = diffDays(invoice.due_date);

    // Sadece 7, 3 veya 1 gün kaldığında tetikle
    if (![7, 3, 1].includes(daysLeft)) return Response.json({ skipped: `daysLeft=${daysLeft}` });

    // Tekrarlı gönderim kontrolü
    if (invoice.last_reminder_sent_days === daysLeft) {
      return Response.json({ skipped: `already sent for daysLeft=${daysLeft}` });
    }

    // Firmanın e-posta adresini al
    const companies = await base44.asServiceRole.entities.Company.filter({ id: invoice.company_id });
    const company = companies[0];
    if (!company?.email) return Response.json({ skipped: "no company email" });

    const urgencyLabel = daysLeft === 1 ? "YARIN" : `${daysLeft} gün sonra`;
    const subject = `Fatura Hatırlatması — ${invoice.company_name} (${urgencyLabel})`;
    const body_text = `Sayın ${company.contact_person || invoice.company_name},

${invoice.company_name} adına düzenlenen faturanız için ödeme tarihi yaklaşmaktadır.

📋 Fatura Detayı
━━━━━━━━━━━━━━
Tutar      : ${formatCurrency(invoice.amount, invoice.currency)}
Vade       : ${invoice.due_date}
Kalan Süre : ${urgencyLabel}

Ödemenizi zamanında gerçekleştirmenizi rica ederiz.

Teşekkürler,
AjansPro Ekibi`;

    // KREDİ TASARRUFU: Core.SendEmail devre dışı (Base44 kredisi yakar).
    // Onun yerine in-app Notification oluştur — kullanıcı bildirim panelinden görebilir.
    await base44.asServiceRole.entities.Notification.create({
      type: "invoice_due_reminder",
      company_id: invoice.company_id,
      severity: daysLeft === 1 ? "warning" : "info",
      title: subject,
      message: `${company.email} adresine bilgilendirme gönderilecek (mail devre dışı).`,
      channels: ["in_app"],
      read: false,
      send_at: new Date().toISOString(),
    }).catch(() => {});

    // Tekrarlı gönderimi önlemek için kaydet
    await base44.asServiceRole.entities.Invoice.update(invoice.id, {
      last_reminder_sent_days: daysLeft
    });

    console.log(`[KREDİ TASARRUFU] Mail atlandı, in-app bildirim oluşturuldu: ${company.email}`);
    return Response.json({ success: true, to: company.email, daysLeft, mode: "in_app_only" });
  } catch (error) {
    console.error("notifyInvoiceDue error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});