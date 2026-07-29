import { base44 } from "../../api/base44Client";

export default async function (req: Request) {
  try {
    const { medication_id, days = 30 } = await req.json();
    
    const doses = await base44.entities.MedicationDose.filter({
      medication_id: medication_id
    });

    const stats = {
      total: doses.length,
      taken: doses.filter(d => d.user_response === "taken").length,
      skipped: doses.filter(d => d.user_response === "skipped").length,
      no_response: doses.filter(d => d.user_response === "no_response").length,
    };

    const compliance_rate = stats.total > 0 ? (stats.taken / stats.total) * 100 : 0;

    return Response.json({ success: true, data: { ...stats, compliance_rate } });
  } catch (error) {
    console.error("getMedicationStats error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
