// Ne-Pa Panel — Şirket-özel AI Chat (Profesyonel Seviye)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, message, history, complex, generator_provider } = await req.json();

    let systemPrompt = "";
    if (company_id) {
      const [companies, styles, baglamlar] = await Promise.all([
        base44.asServiceRole.entities.Company.filter({ id: company_id }, "-created_date", 1),
        base44.asServiceRole.entities.StyleMemory.filter({ company_id }, "-updated_date", 1).catch(() => []),
        base44.asServiceRole.entities.FirmaBaglamHafizasi.filter({ company_id }, "-updated_date", 1).catch(() => []),
      ]);
      const c = companies[0];
      const sm = styles[0];
      const fb = baglamlar[0];

      if (c) {
        const sections = [];

        // ━━━ ROL TANIMI ━━━
        if (complex) {
          sections.push(`Sen ${c.name} markasının kıdemli dijital strateji danışmanısın. 10+ yıl ajans deneyimine sahipsin.

YAKLAŞIMIN:
• Her önerini veri ve sektörel içgörülerle destekle
• Rakip avantajlarını ve pazar fırsatlarını proaktif olarak belirt
• Stratejik düşün: kısa vadeli taktik + uzun vadeli vizyon sun
• Maliyet-fayda perspektifini her zaman göz önünde bulundur
• ROI odaklı, ölçülebilir hedefler öner`);
        } else {
          sections.push(`Sen ${c.name} markasının dijital asistanısın. Hızlı, net ve uygulanabilir cevaplar verirsin.

YAKLAŞIMIN:
• Kısa ve öz ol — gereksiz açıklama yapma
• Somut adımlar sun — "şunu yap" formatında
• Marka kimliğine uygun öneriler ver
• Gerektiğinde emoji ve format kullan (bullet, numaralı liste)`);
        }

        // ━━━ MARKA KİMLİĞİ ━━━
        sections.push(`\n━━━ MARKA KİMLİĞİ ━━━`);
        sections.push(`Firma: ${c.name}`);
        if (c.sector) sections.push(`Sektör: ${c.sector}`);
        if (c.target_audience) sections.push(`Hedef Kitle: ${c.target_audience}`);
        if (c.brand_description) sections.push(`Marka Tanımı: ${c.brand_description}`);
        if (c.brand_keywords?.length) sections.push(`Anahtar Kelimeler: ${c.brand_keywords.join(", ")}`);

        // ━━━ MARKA SESİ ━━━
        if (c.brand_voice_guide) {
          let voice = null;
          try { voice = typeof c.brand_voice_guide === "string" ? JSON.parse(c.brand_voice_guide) : c.brand_voice_guide; } catch (_) {}
          if (voice) {
            sections.push(`\n━━━ MARKA SESİ ━━━`);
            if (voice.ton_sifatlari?.length) sections.push(`Ton: ${voice.ton_sifatlari.join(", ")}`);
            if (voice.hitap_bicimi) sections.push(`Hitap: ${voice.hitap_bicimi}`);
            if (voice.yasak_kelimeler?.length) sections.push(`⛔ ASLA Kullanma: ${voice.yasak_kelimeler.join(", ")}`);
            if (voice.ornek_cumleler?.length) sections.push(`Örnek Cümleler: ${voice.ornek_cumleler.slice(0, 3).join(" | ")}`);
          }
        }

        // ━━━ GÖRSEL & STİL ━━━
        if (sm) {
          sections.push(`\n━━━ GÖRSEL KİMLİK ━━━`);
          if (sm.prompt_injection) sections.push(`Stil Rehberi: ${sm.prompt_injection}`);
          if (sm.mood_tags?.length) sections.push(`Mood: ${sm.mood_tags.join(", ")}`);
          if (sm.dominant_colors?.length) sections.push(`Renkler: ${sm.dominant_colors.join(", ")}`);
        }

        // ━━━ STRATEJİK BAĞLAM ━━━
        if (fb) {
          const z = fb.zenginlestirme_verisi || {};
          const stratParts = [];
          if (z.one_cikan_deger_onerisi) stratParts.push(`Değer Önerisi: ${z.one_cikan_deger_onerisi}`);
          if (z.rekabet_avantaji) stratParts.push(`Rekabet Avantajı: ${z.rekabet_avantaji}`);
          if (z.icerik_firsatlari?.length) stratParts.push(`Fırsatlar: ${z.icerik_firsatlari.join(", ")}`);
          if (fb.sektor_icgoru) stratParts.push(`Sektör İçgörüsü: ${fb.sektor_icgoru}`);
          if (stratParts.length) {
            sections.push(`\n━━━ STRATEJİK BAĞLAM ━━━`);
            sections.push(...stratParts);
          }
        }

        // ━━━ İLETİŞİM ━━━
        const contactParts = [];
        if (c.phone) contactParts.push(`Tel: ${c.phone}`);
        if (c.email) contactParts.push(`E-posta: ${c.email}`);
        if (c.website) contactParts.push(`Web: ${c.website}`);
        if (contactParts.length) {
          sections.push(`\n━━━ İLETİŞİM ━━━`);
          sections.push(...contactParts);
        }

        systemPrompt = sections.join("\n");
      }
    }

    if (!systemPrompt) {
      systemPrompt = `Sen Ne-Pa Panel'in genel dijital danışmanısın. Sosyal medya, içerik stratejisi, marka yönetimi ve dijital pazarlama konularında uzman, pratik ve hızlı cevaplar verirsin. Türkçe yanıt ver.`;
    }

    const histStr = (history || []).slice(-8).map(h => `${h.role}: ${(h.content || "").substring(0, 500)}`).join("\n");

    const prompt = `${histStr ? `SOHBET GEÇMİŞİ:\n${histStr}\n\n` : ""}KULLANICI: ${message}

Türkçe yanıt ver.${complex ? " Detaylı, stratejik ve veri destekli analiz yap." : " Kısa ve net ol."}`;

    // Karmaşık mod: daha uzun, stratejik yanıt için yüksek token limiti.
    // Model seçimi global varsayılana/routing'e bırakılır (OpenRouter kredi limitine takılmamak için).
    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: complex ? "chat_complex" : "chat_simple",
      system_prompt: systemPrompt,
      prompt,
      json_mode: false,
      skip_cache: true,
      provider_override: generator_provider,
      max_tokens: complex ? 1500 : 1000,
    });

    const aiData = aiRes.data || aiRes;
    return Response.json({ reply: aiData.result || "", model: aiData.model_used });
  } catch (error) {
    console.error("aiChat error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});