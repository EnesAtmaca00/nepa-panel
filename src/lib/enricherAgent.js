// KATMAN 4A: Enricher Ajan — İleri Seviye Firma Zenginleştirme
// Multi-pass: Araştır → Analiz Et → Doğrula → Kaydet
import { base44 } from "@/api/base44Client";
import { jinaIcerikCikar, stripThinkBlocks } from "./intelligenceLayer";
import { newWorkflowId, logAgentStep } from "./aiEngineHelpers";

function extractJSON(text) {
  if (!text) return null;
  const cleaned = stripThinkBlocks(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { return null; }
}

// Enrichment sonucunu doğrula — saçma/boş veri kontrolü
function validateEnrichment(result, company) {
  const issues = [];
  
  if (!result.brand_keywords?.length) issues.push("brand_keywords boş");
  else if (result.brand_keywords.some(k => k.length > 50)) issues.push("brand_keywords çok uzun");
  
  if (result.hedef_kitle_ozeti && result.hedef_kitle_ozeti.length < 20) issues.push("hedef_kitle_ozeti çok kısa");
  
  if (result.one_cikan_deger_onerisi && result.one_cikan_deger_onerisi.length < 10) issues.push("deger_onerisi çok kısa");
  
  // Firma adının keyword'lerde olması gereksiz
  if (result.brand_keywords?.some(k => k.toLowerCase() === company.name?.toLowerCase())) {
    issues.push("Firma adı keyword olarak eklendi");
  }
  
  return { valid: issues.length === 0, issues };
}

export async function enricherAjan(company) {
  if (!company?.id) throw new Error("Geçerli firma yok");
  const workflowId = newWorkflowId();

  // ─── PASS 1: ARAŞTIRMA ───
  let websiteIcerik = "";
  if (company.website) {
    websiteIcerik = await jinaIcerikCikar(company.website);
  }

  await logAgentStep({
    workflow_id: workflowId,
    agent_role: "researcher",
    status: "completed",
    related_entity_type: "Company",
    related_entity_id: company.id,
    company_id: company.id,
    input_data: { website: company.website || null, sector: company.sector },
    output_data: {
      website_chars: websiteIcerik.length,
      has_website: !!company.website,
      has_competitors: (company.competitor_handles || []).length > 0,
    },
  });

  // ─── PASS 2: AI ANALİZ ───
  const systemPrompt = `Sen kıdemli bir pazar araştırma ve marka stratejisti uzmanısın.

GÖREV: Firma bilgilerini analiz et, eksik alanları doldur, stratejik öneriler üret.

KURALLAR:
- Gerçekçi ve doğrulanabilir bilgiler üret — uydurma yapma
- Sektöre özgü terminoloji kullan
- Hedef kitle tanımında demografik + psikografik detay ver
- Değer önerisi benzersiz ve rekabetçi olmalı
- Önerilen platformlar firmanın sektörüne ve hedef kitlesine uygun olmalı

SADECE geçerli JSON döndür, başka metin yazma.`;

  const existingKeywords = (company.brand_keywords || []).join(", ");
  const userPrompt = `Firma: ${company.name}
Sektör: ${company.sector || "belirtilmemiş"}
Ülke: ${company.country === "TR" ? "Türkiye" : company.country === "BE" ? "Belçika" : company.country || "belirtilmemiş"}
Mevcut Hedef Kitle: ${company.target_audience || "belirtilmemiş"}
Mevcut Anahtar Kelimeler: ${existingKeywords || "yok"}
Marka Tanımı: ${company.brand_description || "yok"}
Hizmetler: ${(company.agreed_services || []).join(", ") || "belirtilmemiş"}
${websiteIcerik ? `\nWeb Sitesi İçeriği (ilk 2000 karakter):\n${websiteIcerik.substring(0, 2000)}` : "Web sitesi bilgisi mevcut değil."}

Şu JSON formatında analiz yap:
{
  "brand_keywords": ["kelime1", "kelime2", "kelime3", "kelime4", "kelime5"],
  "hedef_kitle_ozeti": "Detaylı hedef kitle: yaş aralığı, ilgi alanları, gelir düzeyi, davranış kalıpları",
  "rakip_avantajlar": "Bu firmayı rakiplerinden ayıran 2-3 somut avantaj",
  "icerik_firsatlari": ["Spesifik fırsat 1", "Spesifik fırsat 2", "Spesifik fırsat 3"],
  "one_cikan_deger_onerisi": "Tek cümlede net ve çarpıcı değer önerisi",
  "onerilen_platformlar": ["instagram_post", "linkedin"],
  "en_uygun_ton": "profesyonel|samimi|eğlenceli|teknik|ilham verici",
  "icerik_stratejisi_notu": "Firma için 2-3 cümlelik içerik stratejisi özeti"
}`;

  let result = null;
  let modelUsed = "";
  try {
    const aiRes = await base44.functions.invoke("aiInvoke", {
      task_type: "content_idea",
      system_prompt: systemPrompt,
      prompt: userPrompt,
      json_mode: true,
      skip_cache: true,
    });
    const aiData = aiRes.data || aiRes;
    if (aiData?.error) throw new Error(aiData.error);
    result = extractJSON(aiData.result);
    modelUsed = aiData.model_used || "";
  } catch (e) {
    await logAgentStep({
      workflow_id: workflowId,
      agent_role: "drafter",
      status: "failed",
      related_entity_type: "Company",
      related_entity_id: company.id,
      company_id: company.id,
      error_message: e.message,
    });
    throw e;
  }

  if (!result) throw new Error("AI sonucu okunamadı");

  // ─── PASS 3: DOĞRULAMA ───
  const validation = validateEnrichment(result, company);
  
  await logAgentStep({
    workflow_id: workflowId,
    agent_role: "drafter",
    status: "completed",
    related_entity_type: "Company",
    related_entity_id: company.id,
    company_id: company.id,
    output_data: {
      keywords_count: (result.brand_keywords || []).length,
      has_value_prop: !!result.one_cikan_deger_onerisi,
      validation_passed: validation.valid,
      validation_issues: validation.issues,
    },
    confidence_score: validation.valid ? 0.9 : 0.6,
    model_used: modelUsed,
    reasoning_log: validation.valid 
      ? "Tüm alanlar geçerli, zenginleştirme başarılı"
      : `Doğrulama sorunları: ${validation.issues.join(", ")}`,
  });

  // ─── PASS 4: KAYDET ───
  // Firma adını keyword'lerden temizle
  const cleanKeywords = (result.brand_keywords || [])
    .filter(k => k && k.toLowerCase() !== company.name?.toLowerCase() && k.length <= 50);

  await base44.entities.Company.update(company.id, {
    brand_keywords: cleanKeywords.length > 0 ? cleanKeywords : (company.brand_keywords || []),
    target_audience: result.hedef_kitle_ozeti || company.target_audience,
  });

  // FirmaBaglamHafizasi'na kaydet
  const zenginlestirmeVerisi = {
    ...result,
    brand_keywords: cleanKeywords,
    website_icerigi_ozeti: websiteIcerik.substring(0, 500),
    zenginlestirme_tarihi: new Date().toISOString(),
    model_used: modelUsed,
    validation: validation,
  };

  const baglamlar = await base44.entities.FirmaBaglamHafizasi.filter({ company_id: company.id }).catch(() => []);
  if (baglamlar?.[0]) {
    await base44.entities.FirmaBaglamHafizasi.update(baglamlar[0].id, {
      zenginlestirme_verisi: zenginlestirmeVerisi,
      son_guncelleme: new Date().toISOString(),
    });
  } else {
    await base44.entities.FirmaBaglamHafizasi.create({
      company_id: company.id,
      company_name: company.name,
      zenginlestirme_verisi: zenginlestirmeVerisi,
      son_guncelleme: new Date().toISOString(),
    });
  }

  return result;
}