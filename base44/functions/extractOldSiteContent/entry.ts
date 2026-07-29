import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Eski web sitesinden içerik çeker ve yapılandırılmış bölümlere ayırır
// (hakkımızda, misyon, vizyon, ürünler, müşteri yorumları, iletişim)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL gerekli' }, { status: 400 });

    // 1) Ham metni ve iç linkleri çek
    let meta;
    try {
      const res = await base44.functions.invoke("fetchUrlMetadata", { url, extract_content: true });
      meta = res.data || res;
    } catch (e) {
      return Response.json({ error: "Site içeriği çekilemedi: " + (e.message || "") }, { status: 502 });
    }

    if (!meta.full_text || meta.full_text.length < 80) {
      return Response.json({ error: "Sitede yeterli metin bulunamadı. Site JavaScript ile yükleniyor olabilir." }, { status: 422 });
    }

    const linkHints = (meta.page_links || []).map(l => `${l.label} (${l.href})`).join(", ");

    // 2) AI ile yapılandır
    const systemPrompt = `Sen bir web içerik analistisin. Verilen ham web sitesi metnini analiz edip firmanın mevcut içeriğini yapılandırılmış bölümlere ayırırsın. SADECE sitede gerçekten var olan bilgiyi çıkar — uydurma, tahmin etme, boş alanları boş bırak.`;

    const userPrompt = `Aşağıda bir firmanın mevcut web sitesinden çekilen ham metin var. Bu metinden firmanın bilgilerini çıkar.

━━━ SİTE META ━━━
Başlık: ${meta.title || "—"}
Açıklama: ${meta.description || "—"}
Bölüm Başlıkları: ${(meta.headings || []).join(" / ") || "—"}
İç Sayfa Linkleri: ${linkHints || "—"}

━━━ HAM METİN ━━━
${meta.full_text}

━━━ İSTENEN ÇIKTI (JSON) ━━━
{
  "firma_tanitimi": "Firmanın kısa tanıtımı / sloganı (sitede varsa)",
  "hakkimizda": "Hakkımızda / kurumsal hikaye metni (sitede varsa, özetleyerek)",
  "misyon": "Misyon metni (sitede varsa)",
  "vizyon": "Vizyon metni (sitede varsa)",
  "degerler": ["Kurumsal değerler — sitede varsa madde madde"],
  "urunler_hizmetler": ["Ürün veya hizmet adları — sitede listelenenler"],
  "musteri_yorumlari": ["Müşteri yorumu / referans / testimonial metinleri — sitede varsa"],
  "iletisim": { "telefon": "", "email": "", "adres": "" },
  "one_cikan_bilgiler": ["Sitede öne çıkan diğer önemli bilgiler — istatistik, yıl, ödül vb."]
}

KURALLAR:
- Sadece metinde GERÇEKTEN bulunan bilgiyi çıkar. Bulamadığın alanı boş string "" veya boş dizi [] bırak.
- Asla bilgi uydurma.
- Uzun metinleri 2-3 cümleyle özetle.
- Sadece JSON döndür.`;

    let aiRes;
    try {
      aiRes = await base44.functions.invoke("aiInvoke", {
        task_type: "content_idea",
        system_prompt: systemPrompt,
        prompt: userPrompt,
        json_mode: true,
        skip_cache: true,
        max_tokens: 2500,
      });
    } catch (e) {
      return Response.json({ error: "İçerik analizi başarısız: " + (e.response?.data?.error || e.message || "") }, { status: 502 });
    }

    const aiData = aiRes.data || aiRes;
    if (aiData?.error) return Response.json({ error: aiData.error }, { status: 502 });

    let content;
    try {
      content = typeof aiData.result === "string" ? JSON.parse(aiData.result) : aiData.result;
    } catch {
      const m = (aiData.result || "").match(/\{[\s\S]*\}/);
      content = m ? JSON.parse(m[0]) : null;
    }

    if (!content) {
      return Response.json({ error: "İçerik ayrıştırılamadı." }, { status: 502 });
    }

    content._source_url = url;
    content._fetched_at = new Date().toISOString();

    return Response.json({ success: true, content, thumbnail: meta.thumbnail, domain: meta.domain });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});