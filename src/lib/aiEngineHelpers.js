// AI Engine Helpers — İleri Seviye (frontend SDK üzerinden çalışan paylaşılan yardımcılar)
import { base44 } from "@/api/base44Client";

/* ─────────────────────────────────────────────
   1. Brand Voice parser — string veya JSON normalize eder
   ───────────────────────────────────────────── */
export function parseBrandVoice(rawGuide) {
  if (!rawGuide) return null;
  if (typeof rawGuide === "object") return rawGuide;
  try {
    return JSON.parse(rawGuide);
  } catch (_e) {
    const text = String(rawGuide);
    const yasakMatch = text.match(/yasak[lı]?\s*kelimeler?[\s\S]*?(?=##|$)/i);
    const tonMatch = text.match(/ton\s*sıfat[lar]?ı?[\s\S]*?(?=##|$)/i);
    const extractList = (block) => {
      if (!block) return [];
      return block.split("\n")
        .map(l => l.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(l => l && l.length < 60 && !l.match(/^#/i))
        .slice(0, 20);
    };
    return {
      raw: text,
      yasak_kelimeler: extractList(yasakMatch?.[0]),
      ton_sifatlari: extractList(tonMatch?.[0]),
    };
  }
}

/* ─────────────────────────────────────────────
   2. Workflow ID üretici
   ───────────────────────────────────────────── */
export function newWorkflowId() {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ─────────────────────────────────────────────
   3. AgentWorkflowLog — kısa yardımcı
   ───────────────────────────────────────────── */
export async function logAgentStep(data) {
  try {
    return await base44.entities.AgentWorkflowLog.create({
      started_at: new Date().toISOString(),
      completed_at: data.status === "waiting_hitl" ? null : new Date().toISOString(),
      ...data,
    });
  } catch (e) {
    console.warn("AgentWorkflowLog yazılamadı:", e?.message);
    return null;
  }
}

/* ─────────────────────────────────────────────
   4. Content Pillar dağılım kontrolü — akıllı öneri motoru
   ───────────────────────────────────────────── */
export async function checkContentPillarBalance(companyId) {
  if (!companyId) return { pillars: {}, suggestion: null, total: 0 };

  let recent = [];
  try {
    recent = await base44.entities.ContentIdea.filter(
      { company_id: companyId, deleted: false },
      "-created_date",
      20
    );
  } catch (_e) {
    return { pillars: {}, suggestion: null, total: 0 };
  }

  const pillars = { egit: 0, eglendir: 0, sat: 0, guven: 0 };
  recent.forEach(i => {
    if (i.content_pillar && pillars[i.content_pillar] !== undefined) {
      pillars[i.content_pillar]++;
    }
  });

  const total = recent.length || 1;
  const rates = {};
  Object.entries(pillars).forEach(([k, v]) => { rates[k] = Math.round((v / total) * 100); });

  // Akıllı öneri: dengesizlikleri tespit et
  let suggestion = null;
  const idealRange = { min: 15, max: 40 }; // Her pillar %15-40 arasında olmalı
  
  const overRepresented = Object.entries(rates).filter(([, r]) => r > idealRange.max);
  const underRepresented = Object.entries(rates).filter(([, r]) => r < idealRange.min);

  if (overRepresented.length > 0) {
    const [overPillar, overRate] = overRepresented[0];
    const [recPillar] = underRepresented.length > 0 ? underRepresented[0] : [null];
    const pillarLabels = { egit: "Eğit", eglendir: "Eğlendir", sat: "Sat", guven: "Güven" };
    
    suggestion = {
      avoidPillar: overPillar,
      recommendPillar: recPillar || (overPillar === "sat" ? "egit" : "guven"),
      reason: `Son ${recent.length} içeriğin %${overRate}'i "${pillarLabels[overPillar]}" odaklı. "${pillarLabels[recPillar || (overPillar === "sat" ? "egit" : "guven")]}" önerilir.`,
    };
  } else if (Object.values(pillars).some(v => v === 0) && recent.length >= 5) {
    const missing = Object.entries(pillars).find(([, v]) => v === 0)?.[0];
    const pillarLabels = { egit: "Eğit", eglendir: "Eğlendir", sat: "Sat", guven: "Güven" };
    suggestion = {
      avoidPillar: null,
      recommendPillar: missing,
      reason: `"${pillarLabels[missing]}" kategorisinde hiç içerik yok. Çeşitlilik için bu tür önerilir.`,
    };
  }

  return { pillars, rates, suggestion, total: recent.length };
}

/* ─────────────────────────────────────────────
   5. Son içerik başlıkları — tekrar önleme
   ───────────────────────────────────────────── */
export async function fetchRecentTitles(companyId, limit = 15) {
  if (!companyId) return [];
  try {
    const recent = await base44.entities.ContentIdea.filter(
      { company_id: companyId, deleted: false },
      "-created_date",
      limit
    );
    return recent.map(i => i.title).filter(Boolean);
  } catch (_e) {
    return [];
  }
}

/* ─────────────────────────────────────────────
   6. Auditor ajanı — İleri Seviye Lokal Kural Motoru
   AI çağrısı yapmadan kapsamlı kalite kontrolü
   ───────────────────────────────────────────── */
export async function runAuditor({ idea, company, workflowId }) {
  const voice = parseBrandVoice(company?.brand_voice_guide);
  const forbidden = voice?.yasak_kelimeler || [];
  const draftText = `${idea.title || ""}\n${idea.caption || idea.captions?.TR || ""}\n${(idea.hashtags || []).join(" ")}`;
  const textLower = draftText.toLowerCase();

  let score = 80; // Başlangıç skoru daha yüksek
  const issues = [];
  const suggestions = [];

  // 1. Yasaklı kelime kontrolü (ağır ceza)
  const forbiddenFound = forbidden.filter(w => w && textLower.includes(String(w).toLowerCase()));
  if (forbiddenFound.length > 0) {
    score -= forbiddenFound.length * 12;
    issues.push(`⛔ Yasaklı kelime: ${forbiddenFound.join(", ")}`);
    suggestions.push(`Şu kelimeleri alternatiflerle değiştirin: ${forbiddenFound.join(", ")}`);
  }

  // 2. Uzunluk kontrolü
  const captionLen = (idea.caption || idea.captions?.TR || "").length;
  if (captionLen < 30) { score -= 15; issues.push("Caption çok kısa (<30 karakter)"); suggestions.push("En az 50 karakter caption yazın"); }
  else if (captionLen < 80) { score -= 5; suggestions.push("Caption biraz daha detaylı olabilir"); }
  if (captionLen > 2200) { score -= 5; issues.push("Instagram karakter limitini aşıyor (>2200)"); }

  // 3. Başlık kontrolü
  if (!idea.title || idea.title.length < 5) { score -= 10; issues.push("Başlık eksik veya çok kısa"); }

  // 4. Hashtag kontrolü
  const hashtagCount = (idea.hashtags || []).length;
  if (hashtagCount === 0) { score -= 8; issues.push("Hashtag yok"); suggestions.push("5-15 arası hashtag ekleyin"); }
  else if (hashtagCount > 30) { score -= 5; issues.push("Çok fazla hashtag (>30)"); }
  else if (hashtagCount < 3) { score -= 3; suggestions.push("En az 5 hashtag önerilir"); }

  // 5. Emoji kontrolü
  const emojiCount = (draftText.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount > 10) { score -= 8; issues.push("Aşırı emoji kullanımı"); }
  else if (emojiCount === 0 && idea.platform?.includes("instagram")) { suggestions.push("Instagram için 2-4 emoji eklemek etkileşimi artırır"); }

  // 6. CTA kontrolü
  const ctaKeywords = ["tıkla", "keşfet", "incele", "link", "biyografi", "profil", "mesaj at", "yorum", "paylaş", "kaydet", "beğen", "click", "discover"];
  const hasCTA = ctaKeywords.some(k => textLower.includes(k));
  if (!hasCTA) { score -= 3; suggestions.push("Bir CTA (eylem çağrısı) eklemek etkileşimi artırır"); }

  // 7. Ton uyumu (basit kontrol)
  if (voice?.ton_sifatlari?.includes("profesyonel") && textLower.match(/haha|lol|:D|xD/)) {
    score -= 5; issues.push("Profesyonel ton ile uyumsuz ifade");
  }

  score = Math.max(0, Math.min(100, score));
  const passed = score >= 65;

  if (workflowId) {
    await logAgentStep({
      workflow_id: workflowId,
      agent_role: "auditor",
      status: "completed",
      related_entity_type: "ContentIdea",
      related_entity_id: idea.id || null,
      company_id: company?.id,
      input_data: { draft_preview: draftText.substring(0, 300), checks_run: 7 },
      output_data: { score, passed, issues, suggestions, mode: "advanced_rule_based" },
      handoff_data: { score, passed, nextAgent: passed ? "reviewer" : "drafter" },
      confidence_score: score / 100,
      model_used: "local",
      reasoning_log: `Gelişmiş denetim: score=${score}, sorunlar=${issues.length}, öneriler=${suggestions.length}`,
    });
  }

  return { score, passed, issues, suggestions, forbiddenFound, model: "local" };
}

/* ─────────────────────────────────────────────
   7. Reviewer ajanı — Otomatik onay
   ───────────────────────────────────────────── */
export async function runReviewerAutoApprove({ workflowId, idea, company }) {
  if (!workflowId) return { autoApproved: true };
  await logAgentStep({
    workflow_id: workflowId,
    agent_role: "reviewer",
    status: "completed",
    related_entity_type: "ContentIdea",
    related_entity_id: idea?.id || null,
    company_id: company?.id,
    output_data: { action: "auto_approved", mode: "auto" },
    handoff_data: { nextAgent: "distributor" },
    hitl_required: false,
    model_used: "local",
  });
  return { autoApproved: true };
}

/* ─────────────────────────────────────────────
   8. Pillar etiket meta
   ───────────────────────────────────────────── */
export const PILLAR_META = {
  egit:      { label: "Eğit",      icon: "📚", className: "bg-blue-100 text-blue-700 border-blue-200" },
  eglendir:  { label: "Eğlendir",  icon: "🎭", className: "bg-purple-100 text-purple-700 border-purple-200" },
  sat:       { label: "Sat",       icon: "💰", className: "bg-orange-100 text-orange-700 border-orange-200" },
  guven:     { label: "Güven",     icon: "🤝", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};