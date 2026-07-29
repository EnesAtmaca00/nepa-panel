// AjansPro — Hedef Hesaplama (event-based + nightly)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function startOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }
function endOfMonth() { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().split("T")[0]; }
function startOfWeek() { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); return d.toISOString().split("T")[0]; }
function endOfWeek() { const d = new Date(startOfWeek()); d.setDate(d.getDate() + 6); return d.toISOString().split("T")[0]; }

function statusOf(pct) {
  if (pct >= 120) return "exceeded";
  if (pct >= 100) return "achieved";
  if (pct >= 70) return "on_track";
  if (pct >= 40) return "at_risk";
  return "behind";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json().catch(() => ({}));

    const companies = company_id
      ? [await base44.asServiceRole.entities.Company.get(company_id)]
      : await base44.asServiceRole.entities.Company.filter({ status: "active" }, "-created_date", 500);

    const ideas = await base44.asServiceRole.entities.ContentIdea.list("-scheduled_date", 2000);
    const recurring = await base44.asServiceRole.entities.RecurringContentInstance.list("-target_date", 1000);

    const updated = [];

    for (const c of companies) {
      if (!c) continue;
      const monthlyTargets = c.monthly_targets || {};
      const weeklyTargets = c.weekly_targets || {};
      const recCounts = c.recurring_counts_toward_target ?? true;

      const periods = [];
      if (Object.keys(monthlyTargets).length > 0) {
        periods.push({ type: "monthly", start: startOfMonth(), end: endOfMonth(), targets: monthlyTargets });
      }
      if (Object.keys(weeklyTargets).length > 0) {
        periods.push({ type: "weekly", start: startOfWeek(), end: endOfWeek(), targets: weeklyTargets });
      }

      for (const p of periods) {
        const cIdeas = ideas.filter(i => i.company_id === c.id && i.work_status === "published" && i.scheduled_date >= p.start && i.scheduled_date <= p.end);
        const achieved = {};
        cIdeas.forEach(i => { achieved[i.platform] = (achieved[i.platform] || 0) + 1; });
        if (recCounts) {
          const r = recurring.filter(x => x.company_id === c.id && x.status === "done" && x.target_date >= p.start && x.target_date <= p.end);
          achieved.instagram_post = (achieved.instagram_post || 0) + r.length;
        }

        const totalT = Object.values(p.targets).reduce((a, b) => a + b, 0);
        const totalA = Object.entries(p.targets).reduce((s, [k]) => s + (achieved[k] || 0), 0);
        const pct = totalT > 0 ? Math.round((totalA / totalT) * 100) : 0;

        const existing = await base44.asServiceRole.entities.TargetTracking.filter({
          company_id: c.id, period_type: p.type, period_start: p.start,
        }, "-period_start", 1);

        const payload = {
          company_id: c.id,
          company_name: c.name,
          period_type: p.type,
          period_start: p.start,
          period_end: p.end,
          targets: p.targets,
          achieved,
          completion_percentage: pct,
          status: statusOf(pct),
          last_calculated_at: new Date().toISOString(),
        };

        if (existing[0]) {
          await base44.asServiceRole.entities.TargetTracking.update(existing[0].id, payload);
        } else {
          await base44.asServiceRole.entities.TargetTracking.create(payload);
        }
        updated.push(`${c.name}-${p.type}`);
      }
    }

    return Response.json({ success: true, updated_count: updated.length });
  } catch (error) {
    console.error("recalculateTargets error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});