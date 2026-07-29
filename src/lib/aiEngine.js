// AjansPro — Merkezi AI Motoru (İleri Seviye)
// Tüm AI çağrıları, agent loglaması, auditor ve pillar balance kontrolü tek yerden yönetilir.
import { base44 } from "@/api/base44Client";

/**
 * Merkezi AI çağrı fonksiyonu.
 * aiInvoke backend'i üzerinden gider (provider routing, cache, budget zaten orada).
 */
export async function callAI({ taskType, systemPrompt, userPrompt, jsonMode = false, settings, skipCache = false, maxTokens }) {
  const res = await base44.functions.invoke("aiInvoke", {
    task_type: taskType,
    prompt: userPrompt,
    system_prompt: systemPrompt,
    json_mode: jsonMode,
    skip_cache: skipCache,
    provider_override: settings?.preferred_ai_provider || "auto",
    max_tokens: maxTokens,
  });

  const data = res.data || res;
  if (data.error) throw new Error(data.error);

  const text = data.result || "";
  const model = data.model_used || "";

  if (jsonMode) {
    // 3 yöntemli JSON parse — hata yerine null döner
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    try { return { text, parsed: JSON.parse(cleaned), model }; } catch (_e1) {}

    const objStart = text.indexOf("{");
    const objEnd = text.lastIndexOf("}");
    if (objStart !== -1 && objEnd > objStart) {
      try { return { text, parsed: JSON.parse(text.substring(objStart, objEnd + 1)), model }; } catch (_e2) {}
    }

    const arrStart = text.indexOf("[");
    const arrEnd = text.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd > arrStart) {
      try { return { text, parsed: JSON.parse(text.substring(arrStart, arrEnd + 1)), model }; } catch (_e3) {}
    }

    console.warn("JSON parse başarısız:", text.substring(0, 200));
    return { text, parsed: null, model };
  }

  return { text, parsed: null, model };
}

// Re-export from single sources
export { buildAISystemPrompt as buildSystemPrompt } from "@/lib/companyContext";
export { logAgentStep, newWorkflowId, runAuditor, runReviewerAutoApprove, checkContentPillarBalance } from "@/lib/aiEngineHelpers";

/**
 * Task-bazlı minimum system prompt.
 */
export function minimumSystemPrompt(taskType, company) {
  const firmaBilgi = company
    ? `Firma: ${company.name}${company.sector ? ` | Sektör: ${company.sector}` : ""}`
    : "";

  const promptlar = {
    content_idea: `İçerik stratejisti. ${firmaBilgi}. Stratejik, platforma optimize, hook+CTA içeren içerik üret. SADECE JSON.`,
    image_prompt: `Görsel yönetmen. ${firmaBilgi}. Midjourney/Flux formatında teknik prompt yaz: [konu], [stil], [aydınlatma], [mood]. SADECE JSON.`,
    caption: `Metin yazarı. ${firmaBilgi}. Hook→Değer→CTA akışıyla caption üret.`,
    caption_translate: `Lokalizasyon uzmanı. ${firmaBilgi}. Marka sesini koruyarak kültürel adaptasyon yap.`,
    hashtag: `Hashtag stratejisti. ${firmaBilgi}. 3 katmanlı: geniş + niş + marka özel. SADECE JSON.`,
    brand_voice: `Marka stratejisti. ${firmaBilgi}. Ton, yasaklı kelimeler, hitap biçimi, örnek cümleler. SADECE JSON.`,
    audit: `İçerik denetçisi. Marka uyumu, teknik kalite, strateji. SADECE JSON: {score:0-100, issues:[], suggestions:[]}`,
    nepa_assistant: `Ne-Pa Panel AI asistanı. Kısa, net, aksiyon odaklı. SADECE JSON: {message:"...", actions:[]}`,
    agent_chat: `${firmaBilgi}. Rolüne uygun, kısa ve net cevap ver (max 3 cümle).`,
    web_architecture: `Web mimarı. ${firmaBilgi}. SEO-uyumlu, mobil-first yapı. SADECE JSON.`,
    win_back: `Müşteri tutma uzmanı. ${firmaBilgi}. Kişisel, samimi win-back mesajı. SADECE JSON.`,
    lead_outreach: `B2B outreach uzmanı. Kısa, kişisel, merak uyandıran ilk temas. SADECE JSON.`,
    monthly_calendar: `İçerik takvimi uzmanı. ${firmaBilgi}. Pillar dengeli aylık plan. SADECE JSON.`,
    chat_simple: `${firmaBilgi}. Kısa ve net yardımcı asistan.`,
    chat_complex: `${firmaBilgi}. Kıdemli dijital danışman. Stratejik, veri destekli analiz.`,
  };

  return promptlar[taskType] || `Uzman AI asistan. ${firmaBilgi}. Görevi profesyonelce tamamla.`;
}

/**
 * HITL gerekli mi?
 */
export function isHITLRequired(taskType, settings) {
  const hitl = settings?.hitl_settings || {};
  const map = {
    content_idea: "content_publish",
    brand_voice: "content_publish",
    monthly_calendar: "content_publish",
    web_architecture: "web_delivery",
    lead_outreach: "lead_message_send",
    win_back: "winback_send",
    sop_generation: "content_publish",
  };
  const key = map[taskType] || "content_publish";
  return hitl[key] ?? true;
}