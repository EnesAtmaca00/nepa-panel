// İlaç kaydedilince/güncellenince bugünkü dozları anında oluştur
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getDay();
  return day === 0 ? 6 : day - 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const med = body.data;
    if (!med || !med.active || !med.schedule_times || med.schedule_times.length === 0) {
      return Response.json({ skipped: "inactive or no schedule" });
    }

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const tz = settingsList[0]?.medication_timezone || "Europe/Paris";
    const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth()+1).padStart(2,"0")}-${String(nowLocal.getDate()).padStart(2,"0")}`;

    if (med.start_date && today < med.start_date) return Response.json({ skipped: "not started yet" });
    if (med.end_date && today > med.end_date) return Response.json({ skipped: "ended" });

    const dayOfWeek = getDayOfWeek(today);
    const allowedDays = (med.days_of_week || []).map(Number);
    if (allowedDays.length > 0 && !allowedDays.includes(dayOfWeek)) {
      return Response.json({ skipped: "not scheduled today" });
    }

    // Bugünkü mevcut dozları çek
    const existingDoses = await base44.asServiceRole.entities.MedicationDose.filter({
      medication_id: med.id,
      scheduled_date: today,
    }, "scheduled_time", 100);

    const existingTimes = new Set(existingDoses.map(d => d.scheduled_time));
    let created = 0;

    for (const time of med.schedule_times) {
      if (!existingTimes.has(time)) {
        await base44.asServiceRole.entities.MedicationDose.create({
          medication_id: med.id,
          medication_name: med.name,
          scheduled_at: `${today}T${time}:00.000Z`,
          scheduled_date: today,
          scheduled_time: time,
          status: "pending",
          reminder_count: 0,
        });
        created++;
      }
    }

    console.log(`onMedicationSaved: ${created} doses created for today`);
    return Response.json({ success: true, created });
  } catch (error) {
    console.error("onMedicationSaved error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});