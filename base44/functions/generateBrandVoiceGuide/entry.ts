import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) return Response.json({ error: 'company_id gerekli' }, { status: 400 });

    const company = await base44.entities.Company.get(company_id);
    if (!company) return Response.json({ error: 'Firma bulunamadı' }, { status: 404 });

    const systemPrompt = `Sen bir marka stratejistisin. Firma için Marka Sesi Rehberini SADECE geçerli JSON formatında döndür. Başka hiçbir şey yazma.`;

    const userPrompt = `Firma: ${company.name}
Sektör: ${company.sector || "—"}
Açıklama: ${company.brand_description || "—"}
Hedef kitle: ${company.target_audience || "—"}
Anahtar kelimeler: ${(company.brand_keywords || []).join(", ") || "—"}
Tercih edilen diller: ${(company.preferred_languages || []).join(", ") || "TR"}

Bu firma için kapsamlı bir Marka Sesi Rehberi üret. SADECE bu JSON şemasında döndür:

{
  "ton_sifatlari": ["5-7 sıfat: profesyonel, samimi, ..."],
  "hitap_bicimi": "Siz/Sizin veya Sen/Senin",
  "yazim_tarzi": "Cümle uzunluğu, emoji ve noktalama tercihleri",
  "kullanilacak_kelimeler": ["en az 10 kelime/kalıp"],
  "yasak_kelimeler": ["en az 10 kelime/kalıp"],
  "ornek_cumleler": ["3-5 örnek sosyal medya cümlesi"],
  "marka_mottolari": ["2-3 motto önerisi"],
  "icerik_pillars": ["Eğit", "Eğlendir", "Sat", "Güven İnşa Et"],
  "platform_notlari": {"instagram": "...", "linkedin": "...", "tiktok": "..."}
}`;

    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "brand_voice",
      prompt: userPrompt,
      system_prompt: systemPrompt,
      json_mode: true,
      skip_cache: true,
    });

    const aiData = aiRes.data || aiRes;
    if (aiData.error) return Response.json({ error: aiData.error }, { status: 500 });

    // JSON string olarak sakla — frontend parse eder
    let brand_voice_guide = aiData.result || "";
    try {
      const parsed = typeof brand_voice_guide === "string" ? JSON.parse(brand_voice_guide) : brand_voice_guide;
      brand_voice_guide = JSON.stringify(parsed);
    } catch (e) {
      // Parse olmazsa ham metni sakla
    }

    await base44.asServiceRole.entities.Company.update(company_id, { brand_voice_guide });

    return Response.json({ success: true, brand_voice_guide, model: aiData.model_used });
  } catch (error) {
    console.error("generateBrandVoiceGuide error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});