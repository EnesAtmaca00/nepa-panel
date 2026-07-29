// AjansPro — Günlük Bildirim & Kontrol Cron
// Her sabah 09:00'da çalışır (Europe/Paris)
// Faturalar, Tekrarlayanlar, Özel Günler, Hedefler, Sözleşme yenilemeleri
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function todayISO() { return new Date().toISOString().split("T")[0]; }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; }
function diffDays(d1, d2 = new Date()) {
  return Math.ceil((new Date(d1).getTime() - new Date(d2).getTime()) / 86400000);
}

async function notify(base44, payload) {
  await base44.asServiceRole.entities.Notification.create({
    severity: "info",
    channels: ["in_app"],
    read: false,
    ...payload,
    send_at: new Date().toISOString(),
  });
}

// KREDİ TASARRUFU: Core.SendEmail devre dışı bırakıldı (Base44 entegrasyon kredisi yakar).
// Mail gönderimi yerine sadece in-app Notification oluşturulur (zaten yapılıyor).
// Gerçek mail göndermek istersen functions/sendEmail (Gmail OAuth) kullan.
async function sendEmail(_base44, { to, subject }) {
  console.log(`[KREDİ TASARRUFU] Mail atlanıldı: ${to} — ${subject}`);
}

async function getAdminEmails(base44) {
  const users = await base44.asServiceRole.entities.User.filter({ role: "admin" });
  return users.map(u => u.email).filter(Boolean);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (isAuth) {
      const user = await base44.auth.me();
      if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const today = todayISO();
    const created = { invoices: 0, recurring: 0, special: 0, targets: 0, contracts: 0 };
    const adminEmails = await getAdminEmails(base44);

    // 1. Bugün fatura kesilecekler — Invoice oluştur
    const companies = await base44.asServiceRole.entities.Company.filter({ status: "active" }, "-created_date", 500);
    const dayNum = new Date().getDate();
    for (const c of companies) {
      if (c.billing_day === dayNum && (c.pricing_type === "monthly" || c.pricing_type === "hybrid") && c.monthly_fee > 0) {
        const monthStart = today.slice(0, 8) + "01";
        const existing = await base44.asServiceRole.entities.Invoice.filter({
          company_id: c.id,
          type: "monthly_subscription",
          issue_date: { $gte: monthStart },
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.Invoice.create({
            company_id: c.id,
            company_name: c.name,
            amount: c.monthly_fee,
            currency: c.currency || "TRY",
            type: "monthly_subscription",
            issue_date: today,
            due_date: addDays(today, 7),
            status: "pending",
          });
          await notify(base44, {
            type: "invoice_created",
            company_id: c.id,
            severity: "info",
            title: `${c.name} için fatura kesildi`,
            message: `${c.monthly_fee} ${c.currency || "TRY"} - vade ${addDays(today, 7)}`,
          });
          // E-posta bildirimi
          for (const email of adminEmails) {
            await sendEmail(base44, {
              to: email,
              subject: `💰 Yeni Fatura: ${c.name}`,
              body: `${c.name} için ${today} tarihli fatura oluşturuldu.\n\nTutar: ${c.monthly_fee} ${c.currency || "TRY"}\nVade: ${addDays(today, 7)}\n\nAjansPro`,
            });
          }
          created.invoices++;
        }
      }
    }

    // 1b. Vadesi yaklaşan faturalar (7, 3, 1 gün) — müşteriye e-posta için notify trigger
    const allPendingInvoices = await base44.asServiceRole.entities.Invoice.filter({ status: "pending" }, "-due_date", 500);
    for (const inv of allPendingInvoices) {
      const dLeft = diffDays(inv.due_date);
      if ([7, 3, 1].includes(dLeft)) {
        // notifyInvoiceDue fonksiyonunu çağır
        await base44.asServiceRole.functions.invoke("notifyInvoiceDue", { data: inv });
        console.log(`Invoice due reminder triggered: ${inv.company_name}, daysLeft: ${dLeft}`);
      }
    }

    // 2. Geciken faturalar
    const pendingInvoices = await base44.asServiceRole.entities.Invoice.filter({ status: "pending" }, "-due_date", 500);
    const overdueList = [];
    for (const inv of pendingInvoices) {
      if (inv.due_date < today) {
        await base44.asServiceRole.entities.Invoice.update(inv.id, { status: "overdue" });
        await notify(base44, {
          type: "invoice_overdue",
          company_id: inv.company_id,
          invoice_id: inv.id,
          severity: "critical",
          title: `🚨 ${inv.company_name} ödemesi gecikti`,
          message: `${Math.abs(diffDays(inv.due_date))} gün gecikti. ${inv.amount} ${inv.currency}`,
        });
        overdueList.push(inv);
      }
    }
    // Geciken faturalar için toplu e-posta
    if (overdueList.length > 0) {
      const lines = overdueList.map(inv =>
        `• ${inv.company_name}: ${inv.amount} ${inv.currency} — ${Math.abs(diffDays(inv.due_date))} gün gecikti`
      ).join("\n");
      for (const email of adminEmails) {
        await sendEmail(base44, {
          to: email,
          subject: `🚨 ${overdueList.length} geciken ödeme`,
          body: `Bugün gecikmiş fatura olan firmalar:\n\n${lines}\n\nAjansPro`,
        });
      }
    }

    // 3. Tekrarlayan instans hatırlatmaları (henüz yapılmadıysa)
    const weekFromNow = addDays(today, 7);
    const upcoming = await base44.asServiceRole.entities.RecurringContentInstance.filter({
      target_date: { $gte: today, $lte: weekFromNow },
      status: { $nin: ["done", "skipped"] }
    }, "target_date", 200);
    for (const inst of upcoming) {
      if (inst.status === "done" || inst.status === "skipped") continue;
      const days = diffDays(inst.target_date);

      if (days === 2 && !inst.reminder_sent_2days) {
        await notify(base44, {
          type: "recurring_2days",
          company_id: inst.company_id,
          related_entity_type: "recurring_content_instance",
          related_entity_id: inst.id,
          severity: "info",
          title: `📅 ${inst.company_name} - ${inst.template_name}`,
          message: `2 gün sonra. Henüz başlanmadı.`,
        });
        await base44.asServiceRole.entities.RecurringContentInstance.update(inst.id, { reminder_sent_2days: true });
        created.recurring++;
      } else if (days === 1 && !inst.reminder_sent_1day) {
        await notify(base44, {
          type: "recurring_1day",
          company_id: inst.company_id,
          related_entity_id: inst.id,
          severity: "warning",
          title: `⏰ Yarın: ${inst.template_name}`,
          message: `${inst.company_name} için yarın yayında olmalı.`,
        });
        await base44.asServiceRole.entities.RecurringContentInstance.update(inst.id, { reminder_sent_1day: true });
        created.recurring++;
      } else if (days === 0 && !inst.reminder_sent_today) {
        await notify(base44, {
          type: "recurring_today",
          company_id: inst.company_id,
          related_entity_id: inst.id,
          severity: "critical",
          title: `🚨 BUGÜN: ${inst.template_name}`,
          message: `${inst.company_name} için BUGÜN. Hala yapılmadı!`,
        });
        await base44.asServiceRole.entities.RecurringContentInstance.update(inst.id, { reminder_sent_today: true });
        created.recurring++;
      }
    }

    // 4. Özel günler — 3 gün sonrası
    const specialDays = await base44.asServiceRole.entities.SpecialDay.list("name", 200);
    const target3 = addDays(today, 3);
    for (const sd of specialDays) {
      let occurrenceDate = null;
      if (sd.date_rule_type === "fixed" && sd.fixed_date) {
        const y = new Date().getFullYear();
        occurrenceDate = `${y}-${sd.fixed_date}`;
        if (occurrenceDate < today) occurrenceDate = `${y + 1}-${sd.fixed_date}`;
      }
      if (occurrenceDate === target3) {
        // Hangi firmalara uygun?
        for (const c of companies) {
          const matchCountry = sd.countries?.includes(c.country) || sd.countries?.includes("GLOBAL");
          const matchSector = !sd.relevant_sectors?.length || sd.relevant_sectors.includes(c.sector);
          const isAssigned = sd.assigned_companies?.includes(c.id);
          if (isAssigned || (matchCountry && matchSector)) {
            await notify(base44, {
              type: "special_day_3",
              company_id: c.id,
              related_entity_type: "special_day",
              related_entity_id: sd.id,
              severity: "info",
              title: `${sd.emoji || "📅"} ${sd.name} 3 gün sonra`,
              message: `${c.name} için tasarım hazırla. ${sd.description || ""}`,
            });
            created.special++;
          }
        }
      }
    }

    // 5. Sözleşme bitişi 30 gün içinde
    for (const c of companies) {
      if (c.contract_end_date) {
        const days = diffDays(c.contract_end_date);
        if (days === 30 || days === 14 || days === 7) {
          await notify(base44, {
            type: "contract_renewal",
            company_id: c.id,
            severity: days <= 7 ? "warning" : "info",
            title: `📝 ${c.name} sözleşme yenileme`,
            message: `${days} gün sonra bitiyor. Yenileme görüşmesi yap.`,
          });
          created.contracts++;
        }
      }
    }

    return Response.json({ success: true, created });
  } catch (error) {
    console.error("runDailyChecks error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});