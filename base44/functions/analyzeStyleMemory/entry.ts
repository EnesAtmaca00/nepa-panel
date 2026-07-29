// AjansPro — Tarz Hafızası Vision Analizi
// Bir şirketin son N dosyasını batch olarak analiz eder ve StyleMemory günceller
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    const company = await base44.asServiceRole.entities.Company.get(company_id);
    if (!company) return Response.json({ error: "Şirket bulunamadı" }, { status: 404 });

    // Resim ve video dosyalarını al (max 10 - batch tasarruf)
    const allFiles = await base44.asServiceRole.entities.FileItem.filter({ company_id }, "-created_date", 100);
    const media = allFiles
      .filter(f => (f.mime_type?.startsWith("image/") || f.mime_type?.startsWith("video/")) && (f.thumbnail_url || f.drive_url))
      .slice(0, 10);

    // Resim yoksa firma bilgileriyle text-based hafıza oluştur
    if (media.length === 0) {
      const textPrompt = `Marka: ${company.name}. Sektör: ${company.sector || "—"}.
Marka açıklaması: ${company.brand_description || "—"}
Hedef kitle: ${company.target_audience || "—"}
Anahtar kelimeler: ${(company.brand_keywords || []).join(", ") || "—"}
Marka renkleri: ${(company.color_palette || []).join(", ") || "—"}
Ülke: ${company.country || "—"}

Bu marka hakkında, görsel dosya analizi YAPAMIYORUZ ama elimizdeki bilgilerle markanın olası görsel tarzını tahmin et.
JSON dön:
{
  "dominant_colors": ${(company.color_palette || []).length > 0 ? JSON.stringify(company.color_palette.slice(0, 3)) : '["#2563eb","#1e293b","#f8fafc"]'},
  "secondary_colors": ["#hex","#hex"],
  "typography_style": "kısa açıklama",
  "composition_patterns": ["merkezli","sol hizalı"],
  "common_elements": ["logo","clean backgrounds"],
  "mood_tags": ["minimal","profesyonel"],
  "ai_summary": "Türkçe 3-4 cümlelik tarz tahmini.",
  "prompt_injection": "Bu markaya uygun: ..."
}`;

      const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
        task_type: "content_idea",
        prompt: textPrompt,
        json_mode: true,
        skip_cache: true,
      });
      const aiData = aiRes.data || aiRes;
      let parsed;
      try {
        parsed = typeof aiData.result === "string" ? JSON.parse(aiData.result) : aiData.result;
      } catch (e) {
        const match = (aiData.result || "").match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : {};
      }

      const existing = await base44.asServiceRole.entities.StyleMemory.filter({ company_id }, "-updated_date", 1);
      const payload = {
        company_id,
        analyzed_files_count: 0,
        last_analysis_date: new Date().toISOString(),
        dominant_colors: parsed.dominant_colors || company.color_palette || [],
        secondary_colors: parsed.secondary_colors || [],
        typography_style: parsed.typography_style || "",
        composition_patterns: parsed.composition_patterns || [],
        common_elements: parsed.common_elements || [],
        mood_tags: parsed.mood_tags || [],
        ai_summary: (parsed.ai_summary || "") + "\n\n⚠️ Bu tarz hafızası görsel analizi olmadan, firma bilgileriyle oluşturulmuştur.",
        prompt_injection: parsed.prompt_injection || "",
      };
      let saved;
      if (existing[0]) {
        saved = await base44.asServiceRole.entities.StyleMemory.update(existing[0].id, payload);
      } else {
        saved = await base44.asServiceRole.entities.StyleMemory.create(payload);
      }
      return Response.json({ success: true, style_memory: saved, analyzed_count: 0, text_based: true });
    }

    // Drive URL'den thumbnail oluştur
    const getDriveThumbnail = (url) => {
      if (!url) return null;
      const match = url.match(/\/d\/([^/?]+)/);
      if (!match) return url;
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    };

    const imageUrls = media.map(f => {
      if (f.thumbnail_url) return f.thumbnail_url;
      if (f.drive_url) return getDriveThumbnail(f.drive_url);
      return null;
    }).filter(Boolean);

    const prompt = `Marka: ${company.name}. Sektör: ${company.sector || "—"}.
Bu ${imageUrls.length} medya dosyasını (görsel/video thumbnail) analiz et ve markanın ortak görsel dilini çıkar.

JSON dön:
{
  "dominant_colors": ["#hex1","#hex2","#hex3"],
  "secondary_colors": ["#hex","#hex"],
  "typography_style": "kısa açıklama",
  "composition_patterns": ["merkezli","sol hizalı","grid"],
  "common_elements": ["rounded corners","gradient backgrounds"],
  "mood_tags": ["minimal","lüks","sıcak"],
  "ai_summary": "Türkçe 3-4 cümlelik tarz özeti.",
  "prompt_injection": "Bu markaya uygun: dominant renkler X, Y; tipografi Z; mood W; elementler ..."
}`;

    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "vision",
      prompt,
      json_mode: true,
      image_urls: imageUrls,
      skip_cache: true, // her seferde fresh
    });

    const aiData = aiRes.data || aiRes;
    let parsed;
    try {
      parsed = typeof aiData.result === "string" ? JSON.parse(aiData.result) : aiData.result;
    } catch (e) {
      const match = (aiData.result || "").match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    // Mevcut StyleMemory varsa güncelle, yoksa oluştur
    const existing = await base44.asServiceRole.entities.StyleMemory.filter({ company_id }, "-updated_date", 1);
    const payload = {
      company_id,
      analyzed_files_count: media.length,
      last_analysis_date: new Date().toISOString(),
      dominant_colors: parsed.dominant_colors || [],
      secondary_colors: parsed.secondary_colors || [],
      typography_style: parsed.typography_style || "",
      composition_patterns: parsed.composition_patterns || [],
      common_elements: parsed.common_elements || [],
      mood_tags: parsed.mood_tags || [],
      ai_summary: parsed.ai_summary || "",
      prompt_injection: parsed.prompt_injection || "",
    };

    let saved;
    if (existing[0]) {
      saved = await base44.asServiceRole.entities.StyleMemory.update(existing[0].id, payload);
    } else {
      saved = await base44.asServiceRole.entities.StyleMemory.create(payload);
    }

    // FileItem'leri ai_analyzed=true yap
    for (const item of media) {
      if (!item.ai_analyzed) {
        await base44.asServiceRole.entities.FileItem.update(item.id, { ai_analyzed: true });
      }
    }

    return Response.json({ success: true, style_memory: saved, analyzed_count: media.length });
  } catch (error) {
    console.error("analyzeStyleMemory error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});