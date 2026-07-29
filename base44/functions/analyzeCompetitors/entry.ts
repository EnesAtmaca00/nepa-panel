// Ne-Pa Panel — Rakip Analizi (DOĞRUDAN OpenRouter — Base44 entegrasyon kredisi tüketmez)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Modele göre dinamik timeout
function getTimeoutForModel(model) {
  const m = (model || "").toLowerCase();
  if (m.includes("nvidia") || m.includes("nemotron") || m.includes("550b") || m.includes("405b") || m.includes("ultra") || m.includes(":free")) return 295000;
  if (m.includes("sonnet") || m.includes("opus") || m.includes("gpt-4o") || m.includes("70b") || m.includes("pro")) return 150000;
  return 90000;
}

async function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI yanıt vermedi (${ms / 1000}sn zaman aşımı).`)), ms);
  });
  try { return await Promise.race([promise, timeoutPromise]); }
  finally { clearTimeout(timer); }
}

// Doğrudan OpenRouter çağrısı — base44.functions.invoke KULLANILMAZ (kredi tüketmez)
async function callOpenRouter(apiKey, model, prompt, jsonMode, maxTokens) {
  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens || 800,
    temperature: 0.7,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) return Response.json({ error: "company_id gerekli" }, { status: 400 });

    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const company = companies[0];
    if (!company) return Response.json({ error: "Şirket bulunamadı" }, { status: 404 });

    const competitors = (company.competitor_handles || []).filter(c => c && c.trim().length > 1);
    if (competitors.length === 0) {
      return Response.json({ error: "Bu müşteri için rakip tanımlanmamış. Önce rakip ekleyin." }, { status: 400 });
    }

    // Ayarlardan OpenRouter key + model — kendi key'imizle gideriz, Base44 kredisi YOK
    const settings = (await base44.asServiceRole.entities.AppSettings.list())[0] || {};
    const apiKey = settings.openrouter_api_key;
    if (!apiKey) {
      return Response.json({ error: "Ayarlar'da OpenRouter API key tanımlı değil. Lütfen Ayarlar > AI Model sayfasından gir." }, { status: 400 });
    }
    const model = settings.default_ai_model || "google/gemini-2.5-flash-lite";
    const timeout = getTimeoutForModel(model);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const period_end = now.toISOString().slice(0, 10);
    const period_start = weekAgo.toISOString().slice(0, 10);

    const report = await base44.asServiceRole.entities.CompetitorReport.create({
      company_id,
      company_name: company.name,
      period_start,
      period_end,
      status: "generating",
      model_used: model,
    });

    try {
      // ━━━ ADIM 1: Rakip araştırması ━━━
      const competitorList = competitors.map((c, i) => `${i + 1}. ${c}`).join("\n");

      const researchPrompt = `Sen uluslararası deneyime sahip kıdemli bir dijital pazarlama analistissin. Aşağıdaki müşterinin rakiplerini ${period_start} — ${period_end} dönemi için derinlemesine araştır.

MÜŞTERİ PROFİLİ:
• Firma: ${company.name}
• Sektör: ${company.sector || "Belirtilmemiş"}
• Hedef Kitle: ${company.target_audience || "Belirtilmemiş"}
• Marka Tanımı: ${company.brand_description || "Belirtilmemiş"}

ANALİZ EDİLECEK RAKİPLER:
${competitorList}

HER RAKİP İÇİN ARAŞTIR:
1. Instagram, TikTok, LinkedIn, Facebook'taki son paylaşımlar ve kampanyalar
2. Haftalık paylaşım sıklığı (tahmini post/hafta)
3. Ortalama etkileşim oranı (beğeni/yorum tahmini)
4. En çok kullandıkları hashtagler (en az 5 adet)
5. İçerik türleri dağılımı (reels/post/story/carousel yüzdesi)
6. En aktif gün ve saat dilimi
7. Güçlü stratejik hamleler ve dikkat çekici kampanyalar
8. Zayıf noktalar ve kaçırılan fırsatlar

FORMAT — Her rakip için:
### [Rakip Adı] (@handle)
- Platform: ...
- Post/hafta: ...
- Ort. etkileşim: ...
- Top hashtagler: #tag1, #tag2, #tag3 ...
- İçerik tipleri: ...
- En iyi saat: ...
- Son aktivite: ...
- Güçlü yönler: ...
- Zayıf noktalar: ...`;

      const researchText = await withTimeout(
        callOpenRouter(apiKey, model, researchPrompt, false, 4000),
        timeout
      );

      // ━━━ ADIM 2: Yapılandırılmış analiz + fırsat önerileri ━━━
      const analysisPrompt = `Aşağıda "${company.name}" müşterisi için detaylı rakip araştırması var. Bu araştırmayı analiz ederek kapsamlı ve stratejik bir rapor oluştur.

MÜŞTERİ:
• Firma: ${company.name}
• Sektör: ${company.sector || "—"}
• Hedef Kitle: ${company.target_audience || "—"}
• Anahtar Kelimeler: ${(company.brand_keywords || []).join(", ") || "—"}
• Mevcut Hizmetler: ${(company.agreed_services || []).join(", ") || "—"}

RAKİP ARAŞTIRMASI SONUÇLARI:
${researchText}

ANALİZ KURALLARI:
1. competitors_analyzed: Her rakip için tüm alanları eksiksiz doldur. Minimum 5 hashtag/rakip.
2. top_hashtags_overall: Tüm rakiplerde ortak kullanılan en az 8 hashtag, frekans sıralı.
3. weaknesses: Müşterinin rakiplere göre EN AZ 3 zayıf yönü — somut, ölçülebilir, aksiyon alınabilir.
4. opportunities: EN AZ 4 stratejik fırsat — her biri "neden fırsat" ve "somut adım" içermeli.
5. opportunity_posts: EN AZ 4 hazır içerik önerisi — caption fikri gerçekçi ve uygulanabilir olmalı.
6. executive_summary: 5-7 cümle, C-level yöneticiye sunulabilir kalitede, eylem odaklı Türkçe özet.

ÖNEMLİ:
- Tüm metinler profesyonel TÜRKÇE olmalı
- Fırsat önerileri rakiplerin boşluklarını hedeflemeli
- Caption fikirleri markanın tonuna uygun olmalı
- Severity/priority değerleri gerçekçi ve tutarlı olmalı

Aşağıdaki JSON yapısını AYNEN kullan:
{
  "competitors_analyzed": [
    {
      "handle": "@handle",
      "platform": "instagram|tiktok|linkedin|facebook",
      "name": "Marka Adı",
      "summary": "2-3 cümle stratejik özet",
      "recent_activity": "Son hafta detaylı aktivite",
      "strengths": ["güçlü yön 1", "güçlü yön 2", "güçlü yön 3"],
      "posts_per_week": 5,
      "avg_engagement": "%3.2",
      "top_hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
      "best_post_time": "Salı 19:00",
      "content_types": ["Reels", "Carousel", "Story"]
    }
  ],
  "top_hashtags_overall": [
    { "tag": "#hashtag", "count": 4, "competitors": ["rakip1", "rakip2"] }
  ],
  "posting_frequency_summary": {
    "rakip_adi": 5
  },
  "weaknesses": [
    { "title": "Başlık", "description": "Detaylı açıklama", "severity": "high|medium|low" }
  ],
  "opportunities": [
    { "title": "Başlık", "description": "Neden fırsat", "action": "Somut adım", "priority": "high|medium|low" }
  ],
  "opportunity_posts": [
    {
      "title": "İçerik başlığı",
      "platform": "instagram",
      "format": "Reels|Post|Story|Carousel",
      "caption_idea": "Hazır caption metni — hook + değer + CTA",
      "best_time": "Çarşamba 19:00",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "rationale": "Hangi rakip boşluğunu kapatıyor",
      "priority": "high|medium|low"
    }
  ],
  "executive_summary": "C-level özet — 5-7 cümle, eylem odaklı."
}

Sadece JSON döndür, başka hiçbir metin ekleme.`;

      const analysisRaw = await withTimeout(
        callOpenRouter(apiKey, model, analysisPrompt, true, 6000),
        timeout
      );

      let analysis;
      try {
        analysis = JSON.parse(analysisRaw);
      } catch (_) {
        const match = (analysisRaw || "").match(/\{[\s\S]*\}/);
        analysis = match ? JSON.parse(match[0]) : null;
      }

      if (!analysis) throw new Error("Analiz JSON parse edilemedi");

      await base44.asServiceRole.entities.CompetitorReport.update(report.id, {
        competitors_analyzed: analysis.competitors_analyzed || [],
        weaknesses: analysis.weaknesses || [],
        opportunities: analysis.opportunities || [],
        opportunity_posts: analysis.opportunity_posts || [],
        top_hashtags_overall: analysis.top_hashtags_overall || [],
        posting_frequency_summary: analysis.posting_frequency_summary || {},
        executive_summary: analysis.executive_summary || "",
        model_used: model,
        status: "completed",
      });

      return Response.json({
        success: true,
        report_id: report.id,
        executive_summary: analysis.executive_summary || "",
        weaknesses_count: (analysis.weaknesses || []).length,
        opportunities_count: (analysis.opportunities || []).length,
        opportunity_posts_count: (analysis.opportunity_posts || []).length,
      });
    } catch (innerErr) {
      await base44.asServiceRole.entities.CompetitorReport.update(report.id, {
        status: "failed",
        error_message: innerErr.message,
      });
      // Hata günlüğü
      try {
        await base44.asServiceRole.entities.AIErrorLog.create({
          function_name: "analyzeCompetitors",
          task_type: "competitor_analysis",
          model_used: model,
          provider: "openrouter",
          error_message: innerErr.message,
          error_type: innerErr.message?.includes("zaman aşımı") ? "timeout" : "api_error",
          context_info: company.name,
          resolved: false,
        });
      } catch (_) {}
      throw innerErr;
    }
  } catch (error) {
    console.error("analyzeCompetitors error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});