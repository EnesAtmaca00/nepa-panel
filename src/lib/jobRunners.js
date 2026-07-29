import { base44 } from "@/api/base44Client";

/**
 * Arka planda çalıştırılacak işlem fonksiyonları.
 * Bunlar runJob ile çağrılır; sayfa unmount olsa bile çalışmaya devam eder.
 */

// Web mimarisi üretimi (ilk üretim veya yeniden oluşturma)
export async function runWebsiteArchitectureJob(projectId, revisionFeedback) {
  await base44.entities.WebsiteProject.update(projectId, {
    generation_status: "generating",
    delivery_status: "Analiz Aşamasında",
  });

  const res = await base44.functions.invoke("generateWebsiteArchitecture", {
    project_id: projectId,
    revision_feedback: revisionFeedback,
  });
  if (res?.data?.error) {
    await base44.entities.WebsiteProject.update(projectId, { generation_status: "error" });
    throw new Error(res.data.error);
  }

  return await base44.entities.WebsiteProject.get(projectId);
}