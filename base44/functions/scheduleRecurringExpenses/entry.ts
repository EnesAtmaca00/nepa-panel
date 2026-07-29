// Her ay başı tekrarlayan giderleri kopyalar
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const recurringExpenses = await base44.asServiceRole.entities.Expense.filter({
      is_recurring: true,
      deleted_at: null,
    }, 'title', 200);

    let created = 0;

    for (const exp of recurringExpenses) {
      const nextDate = exp.next_payment_date;
      if (!nextDate || nextDate > todayStr) continue;

      // Yeni kayıt oluştur
      const newPaymentDate = nextDate;
      let nextNext = null;
      const d = new Date(nextDate);

      if (exp.recurring_frequency === 'monthly') {
        d.setMonth(d.getMonth() + 1);
        nextNext = d.toISOString().split('T')[0];
      } else if (exp.recurring_frequency === 'quarterly') {
        d.setMonth(d.getMonth() + 3);
        nextNext = d.toISOString().split('T')[0];
      } else if (exp.recurring_frequency === 'yearly') {
        d.setFullYear(d.getFullYear() + 1);
        nextNext = d.toISOString().split('T')[0];
      }

      await base44.asServiceRole.entities.Expense.create({
        title: exp.title,
        amount: exp.amount,
        category: exp.category,
        payment_date: newPaymentDate,
        is_recurring: false,
        notes: exp.notes,
        company_id: exp.company_id,
        company_name: exp.company_name,
        status: 'pending',
      });

      // next_payment_date güncelle
      await base44.asServiceRole.entities.Expense.update(exp.id, {
        next_payment_date: nextNext,
      });

      created++;
    }

    return Response.json({ success: true, created });
  } catch (error) {
    console.error('scheduleRecurringExpenses error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});