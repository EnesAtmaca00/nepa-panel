// AjansPro — Otomatik İçerik Planı Üreticisi
// Firma sektörü, hedef kitlesi, rakip verileri ve stil hafızasını kullanarak
// belirtilen süre için tam bir içerik planı (fikirler + tarihler + caption + hashtag + görsel önerisi) üretir.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      company_id,
      period_weeks = 4,       // kaç haftalık plan (1-8)
      posts_per_week = 3,     // haftalık post sayısı
      platforms = ["instagram_post"],
      languages = ["TR"],
      tone = "samimi",
      start_date,             // ISO date string, yoksa bugün
      use_competitor_data = true,
      use_style_memory = true,
    } = await req.json();

    if (!company_id) return Response.json({ error: "company_id zorunlu" }, { status: 400 });

    const company = await base44.asServiceRole.entities.Company.get(company_id);
    if (!company) return Response.json({ error: "Şirket bulunamadı" }, { status: 404 });

    // Stil hafızası
    let styleInjection = "";
    if (use_style_memory) {
      const sm = await base44.asServiceRole.entities.StyleMemory.filter({ company_id }, "-updated_date", 1);
      if (sm[0]?.prompt_injection) styleInjection = `\nMarka Tarz Hafızası: ${sm[0].prompt_injection}`;
    }

    // Son rakip raporu
    let competitorContext = "";
    if (use_competitor_data) {
      const reports = await base44.asServiceRole.entities.CompetitorReport.filter(
        { company_id, status: "completed" }, "-created_date", 1
      );
      if (reports[0]) {
        const r = reports[0];
        const topHashtags = (r.top_hashtags_overall || []).slice(0, 10).map(h => h.tag).join(", ");
        const competitors = (r.competitors_analyzed || []).slice(0, 3).map(c =>
          `${c.name} (${c.posts_per_week || "?"} post/hafta, en iyi saat: ${c.best_post_time || "?"}, popüler içerik: ${(c.content_types || []).slice(0, 2).join(", ")})`
        ).join("; ");
        const opportunities = (r.opportunities || []).slice(0, 3).map(o => o.title).join(", ");
        competitorContext = `\nRakip Analizi:
- Rakipler: ${competitors}
- Rakiplerin en çok kullandığı hashtagler: ${topHashtags}
- Fırsatlar: ${opportunities}`;
      }
    }

    // TÜM geçmiş içerikler — asla tekrarlama olmasın (son 200 içerik)
    const allPast = await base44.asServiceRole.entities.ContentIdea.filter({ company_id }, "-created_date", 200);

    // Eksik #5 — Pillar dengesi: son 20 içeriğin dağılımını çıkar, dengesizliği prompt'a bildir
    const pillarLabelsTr = { egit: "Eğit (eğitici/otorite)", eglendir: "Eğlendir (viral/eğlence)", sat: "Sat (dönüşüm)", guven: "Güven (sadakat/sosyal kanıt)" };
    const recent20 = allPast.slice(0, 20);
    const pillarCounts = { egit: 0, eglendir: 0, sat: 0, guven: 0 };
    recent20.forEach(i => { if (i.content_pillar && pillarCounts[i.content_pillar] !== undefined) pillarCounts[i.content_pillar]++; });
    const pillarTotal = recent20.length || 1;
    const pillarRates = Object.fromEntries(Object.entries(pillarCounts).map(([k, v]) => [k, Math.round((v / pillarTotal) * 100)]));
    const eksikPillar = Object.entries(pillarCounts).filter(([, v]) => v === 0).map(([k]) => pillarLabelsTr[k]);
    const fazlaPillar = Object.entries(pillarRates).filter(([, r]) => r > 45).map(([k, r]) => `${pillarLabelsTr[k]} (%${r})`);
    let pillarContext = `\n\n━━━ İÇERİK DİREĞİ (PILLAR) DENGESİ ━━━
4 içerik direğini dengeli dağıt: Eğit / Eğlendir / Sat / Güven. Her içeriğe "content_pillar" alanı ekle (değer: egit|eglendir|sat|guven).`;
    if (fazlaPillar.length) pillarContext += `\n⚠️ Son içeriklerde AŞIRI yoğun: ${fazlaPillar.join(", ")} — bunları AZALT.`;
    if (eksikPillar.length) pillarContext += `\n📌 Hiç üretilmemiş, ÖNCELİK ver: ${eksikPillar.join(", ")}.`;

    // Eksik #10 — Takvim/sezon farkındalığı
    const aylar = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    const now = new Date();
    const dateContext = `\n\n━━━ TAKVİM FARKINDALIĞI ━━━\nŞu an: ${aylar[now.getMonth()]} ${now.getFullYear()}. İçerikleri bu döneme uygun (mevsim, yaklaşan tatiller, gündem) kurgula. Geçmiş veya alakasız sezonlardan kaçın.`;

    let pastContentContext = "";
    if (allPast.length > 0) {
      // Başlık + konu + caption özeti
      const pastSummaries = allPast.map(r => {
        const parts = [r.title];
        if (r.topic) parts.push(r.topic);
        if (r.caption) parts.push(r.caption.slice(0, 60));
        return parts.join(" | ");
      });
      pastContentContext = `\n\n⚠️ KRİTİK — ASLA TEKRARLAMA: Bu firma için daha önce üretilmiş ${allPast.length} içerik var. Aşağıdakilerin HIÇBIRINI tekrarlama, benzer başlık bile koyma, farklı açılardan yeni içerikler üret:\n${pastSummaries.slice(0, 80).join("\n")}\n(Bu listede olmayan, tamamen özgün içerikler üret. Konu benzer olabilir ama yaklaşım, format ve mesaj tamamen farklı olmalı.)`;
    }

    // Takvim tarihleri
    const startDate = start_date ? new Date(start_date) : new Date();
    const totalPosts = period_weeks * posts_per_week;

    // Haftanın hangi günleri paylaşım yapılacak (posts_per_week'e göre ideal günler)
    const IDEAL_DAYS_MAP = {
      1: [2],           // Çarşamba
      2: [1, 4],        // Pzt, Per
      3: [1, 3, 5],     // Pzt, Çar, Cum
      4: [1, 2, 4, 5],  // Pzt, Sal, Per, Cum
      5: [1, 2, 3, 4, 5], // Hft içi
      6: [1, 2, 3, 4, 5, 6],
      7: [0, 1, 2, 3, 4, 5, 6],
    };
    const idealDays = IDEAL_DAYS_MAP[Math.min(posts_per_week, 7)] || [1, 3, 5];

    // Tüm tarihler
    const scheduleDates = [];
    let cursor = new Date(startDate);
    while (scheduleDates.length < totalPosts) {
      const dayOfWeek = cursor.getDay(); // 0=Pazar
      if (idealDays.includes(dayOfWeek)) {
        scheduleDates.push(cursor.toISOString().split("T")[0]);
      }
      cursor = new Date(cursor.getTime() + 86400000);
    }

    const platformsStr = platforms.join(", ");
    const langsStr = languages.join(", ");

    const prompt = `Sen deneyimli bir sosyal medya stratejisti ve içerik üreticisisin.
Aşağıdaki marka için ${period_weeks} haftalık (${totalPosts} içerik) tam bir sosyal medya içerik planı oluştur.

Marka Bilgileri:
- İsim: ${company.name}
- Sektör: ${company.sector || "—"}
- Hedef Kitle: ${company.target_audience || "—"}
- Marka Tanımı: ${company.brand_description || "—"}
- Marka Anahtar Kelimeleri: ${(company.brand_keywords || []).join(", ") || "—"}
- Ton: ${tone}
- Platformlar: ${platformsStr}
- Diller: ${langsStr}
${styleInjection}
${competitorContext}
${pillarContext}
${dateContext}
${pastContentContext}

⛔ ASLA ÜRETME (jenerik/tembel içerik): "X'in 5 faydası", "Bunu biliyor muydunuz?", "Mutlu Pazartesiler", boş motivasyon sözleri, klişe stok-fotoğraf tarifleri. Her fikir spesifik, markaya özel ve bir içgörüye dayalı olmalı.

İçerik planını oluştururken:
1. Her platform için optimize et (Instagram'da görsel/reels ağırlıklı, LinkedIn'de profesyonel vb.)
2. Çeşitli içerik türleri kullan (eğitici, eğlenceli, tanıtım, kullanıcı deneyimi, sektör haberi, vs.)
3. Rakip verilerini kullan ama farklılaş
4. Her içerik için özgün caption ve hedeflenen hashtagler yaz
5. Görsel önerisi ile içeriği canlandır
6. Her içeriğe content_pillar ata ve yukarıdaki pillar dengesini gözet

Aşağıdaki JSON formatında tam ${totalPosts} adet içerik üret. Tarihler sırasıyla: ${scheduleDates.join(", ")}

{
  "plan_title": "Planın kısa başlığı",
  "plan_summary": "Planın genel stratejisi (2-3 cümle)",
  "posts": [
    {
      "index": 1,
      "scheduled_date": "${scheduleDates[0]}",
      "title": "İçerik başlığı",
      "platform": "instagram_post",
      "content_pillar": "egit|eglendir|sat|guven",
      "content_type": "Carousel|Reels|Static Post|Story|Video|Infographic",
      "hook": "Dikkat çekici açılış cümlesi",
      "caption": "Tam caption metni (emoji dahil, doğal dil)",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "visual_suggestion": "Görsel/video için öneri (renk, kompozisyon, metin overlay, vs.)",
      "brief": "İçeriğin amacı ve üretim notları",
      "suggested_time": "19:00"
    }
  ]
}`;

    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "content_idea",
      prompt,
      json_mode: true,
      skip_cache: true,
      provider_override: "auto",
    });

    const aiData = aiRes.data || aiRes;
    if (aiData?.error) throw new Error(aiData.error);
    let parsed;
    try {
      parsed = typeof aiData.result === "string" ? JSON.parse(aiData.result) : aiData.result;
    } catch (e) {
      const match = (aiData.result || "").match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { posts: [] };
    }

    let posts = Array.isArray(parsed?.posts) ? parsed.posts : [];

    // Eksik #9 — Şema doğrulama: hiç içerik üretilmemişse hata döndür
    if (posts.length === 0) {
      throw new Error("AI içerik planı üretemedi (boş yanıt). Lütfen tekrar deneyin.");
    }

    // Hata #4 — Yasaklı kelime denetimi: toplu plan da marka kurallarına uymalı
    // Marka sesi hem JSON hem markdown formatında olabilir — ikisini de destekle
    let forbidden = [];
    const rawVoice = company.brand_voice_guide;
    if (rawVoice) {
      if (typeof rawVoice === "object") {
        forbidden = (rawVoice.yasak_kelimeler || []).filter(Boolean);
      } else {
        try {
          forbidden = (JSON.parse(rawVoice).yasak_kelimeler || []).filter(Boolean);
        } catch (_) {
          // Markdown: "## ❌ Yasaklı Kelimeler" başlığı altındaki madde listesini çıkar
          const m = String(rawVoice).match(/yasakl[ıi]\s*kelimeler[^\n]*\n([\s\S]*?)(?=\n#|$)/i);
          if (m) {
            forbidden = m[1].split("\n")
              .map(l => l.replace(/^[-*•\d.)\s]+/, "").replace(/\(.*?\)/g, "").trim())
              .filter(l => l && l.length < 40);
          }
        }
      }
    }

    if (forbidden.length > 0) {
      posts = posts.map(p => {
        const blob = `${p.title || ""} ${p.caption || ""} ${p.hook || ""}`.toLowerCase();
        const hits = forbidden.filter(w => blob.includes(String(w).toLowerCase()));
        return hits.length ? { ...p, _forbidden_words: hits } : p;
      });
    }

    return Response.json({
      plan_title: parsed.plan_title || `${company.name} — ${period_weeks} Haftalık Plan`,
      plan_summary: parsed.plan_summary || "",
      posts,
      schedule_dates: scheduleDates,
    });

  } catch (error) {
    console.error("generateContentPlan error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});