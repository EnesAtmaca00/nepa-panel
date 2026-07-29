// AjansPro — İlaç Doz Planlayıcı (her gece 02:00)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

function getDayOfWeek(dateStr) {
  // 0=Pzt, 6=Paz
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getDay();
  return day === 0 ? 6 : day - 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const tz = settingsList[0]?.medication_timezone || "Europe/Paris";
    const medications = await base44.asServiceRole.entities.Medication.filter({ active: true });
    const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth()+1).padStart(2,"0")}-${String(nowLocal.getDate()).padStart(2,"0")}`;
    let created = 0;

    for (const med of medications) {
      if (!med.schedule_times || med.schedule_times.length === 0) continue;

      // Sonraki 7 gün için dozları planla (30 yerine 7 - performans)
      const datesToPlan = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(today, i);
        if (med.start_date && date < med.start_date) continue;
        if (med.end_date && date > med.end_date) continue;
        const dayOfWeek = getDayOfWeek(date);
        const allowedDays = (med.days_of_week || []).map(Number);
        if (allowedDays.length > 0 && !allowedDays.includes(dayOfWeek)) continue;
        datesToPlan.push(date);
      }

      if (datesToPlan.length === 0) continue;

      // Mevcut dozları toplu çek (tek sorgu)
      const firstDate = datesToPlan[0];
      const lastDate = datesToPlan[datesToPlan.length - 1];
      const existingDoses = await base44.asServiceRole.entities.MedicationDose.filter({
        medication_id: med.id,
        scheduled_date: { $gte: firstDate, $lte: lastDate },
      }, "scheduled_date", 500);

      // Mevcut dozları set'e al
      const existingSet = new Set(existingDoses.map(d => `${d.scheduled_date}_${d.scheduled_time}`));

      // Eksik dozları oluştur
      for (const date of datesToPlan) {
        for (const time of med.schedule_times) {
          const key = `${date}_${time}`;
          if (!existingSet.has(key)) {
            await base44.asServiceRole.entities.MedicationDose.create({
              medication_id: med.id,
              medication_name: med.name,
              scheduled_at: `${date}T${time}:00.000Z`,
              scheduled_date: date,
              scheduled_time: time,
              status: "pending",
              reminder_count: 0,
            });
            created++;
          }
        }
      }
    }

    console.log(`scheduleMedicationDoses: ${created} doses created`);
    return Response.json({ success: true, created });
  } catch (error) {
    console.error("scheduleMedicationDoses error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});