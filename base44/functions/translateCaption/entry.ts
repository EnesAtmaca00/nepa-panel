// Ne-Pa Panel — Caption Çevirici & Lokalize Edici (Profesyonel)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { caption, source_language, target_languages, company_id, generator_provider } = await req.json();
    if (!caption || !target_languages?.length) {
      return Response.json({ error: "caption ve target_languages gerekli" }, { status: 400 });
    }

    // ━━━ Zengin firma bağlamı ━━━
    let brandBlock = "";
    if (company_id) {
      const [companies, voiceResults] = await Promise.all([
        base44.asServiceRole.entities.Company.filter({ id: company_id }),
        base44.asServiceRole.entities.FirmaBaglamHafizasi.filter({ company_id }, "-updated_date", 1).catch(() => []),
      ]);
      const c = companies[0];
      if (c) {
        const parts = [`Marka: ${c.name}`];
        if (c.sector) parts.push(`Sektör: ${c.sector}`);
        if (c.target_audience) parts.push(`Hedef Kitle: ${c.target_audience}`);
        if (c.brand_description) parts.push(`Marka Tanımı: ${c.brand_description}`);
        if (c.brand_voice_guide) {
          let voice = null;
          try { voice = typeof c.brand_voice_guide === "string" ? JSON.parse(c.brand_voice_guide) : c.brand_voice_guide; } catch (_) {}
          if (voice?.ton_sifatlari?.length) parts.push(`Marka Tonu: ${voice.ton_sifatlari.join(", ")}`);
          if (voice?.yasak_kelimeler?.length) parts.push(`⛔ Yasaklı Kelimeler: ${voice.yasak_kelimeler.join(", ")}`);
        }
        const fb = voiceResults[0];
        if (fb?.zenginlestirme_verisi?.one_cikan_deger_onerisi) {
          parts.push(`Değer Önerisi: ${fb.zenginlestirme_verisi.one_cikan_deger_onerisi}`);
        }
        brandBlock = parts.join("\n");
      }
    }

    const langNames = {
      TR: "Türkçe", EN: "İngilizce", NL: "Felemenkçe (Hollandaca)", 
      FR: "Fransızca", DE: "Almanca", AR: "Arapça"
    };
    const sourceLangName = langNames[source_language] || source_language;
    const targetList = target_languages.map(l => `${l} (${langNames[l] || l})`).join(", ");

    const systemPrompt = `Sen dünya çapında deneyimli bir lokalizasyon ve transkreasyon uzmanısın. Sosyal medya içeriklerini sadece çevirmekle kalmaz, hedef kültürün dijital iletişim normlarına tam uyumlu hale getirirsin.

TEMEL PRENSİPLER:
1. TRANSKREASYON — Kelime kelime çeviri YAPMA. Mesajın ruhunu, amacını ve duygusal etkisini hedef dilde yeniden yarat.
2. KÜLTÜREL ADAPTASYON — Deyimler, espriler, popüler kültür referanslarını hedef kültürün karşılıklarıyla değiştir.
3. MARKA TUTARLILIĞI — Marka sesini ve tonunu her dilde tutarlı koru. Yasaklı kelimelerden her dilde kaçın.
4. PLATFORM OPTİMİZASYONU — Her dilde o ülkedeki sosyal medya kullanım alışkanlıklarını yansıt.
5. HASHTAG STRATEJİSİ — Uluslararası hashtagleri koru, yerel hashtagleri hedef dilin trendlerine göre adapte et.
6. EMOJİ KULLANIMI — Emoji anlamları kültürden kültüre değişir, buna dikkat et.
7. CTA ADAPTASYONU — Harekete geçirici ifadeleri hedef kültürün normlarına göre ayarla (siz/sen, resmi/samimi).

${brandBlock ? `\n━━━ MARKA BAĞLAMI ━━━\n${brandBlock}` : ""}`;

    const prompt = `Kaynak dil: ${sourceLangName}
Hedef diller: ${targetList}

ORİJİNAL CAPTION:
---
${caption}
---

Her hedef dil için:
- caption: Transkree edilmiş metin — aynı duygusal etki, kültürel uyum, marka tutarlılığı
- hashtags: 5-8 adet — uluslararası + yerel karışımı

JSON formatı:
{
  "translations": {
    "${target_languages[0]}": {
      "caption": "Lokalize edilmiş caption",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }
  }
}

Sadece JSON döndür.`;

    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "caption_translate",
      system_prompt: systemPrompt,
      prompt,
      json_mode: true,
      provider_override: generator_provider,
    });

    const aiData = aiRes.data || aiRes;
    let parsed;
    try {
      parsed = typeof aiData.result === "string" ? JSON.parse(aiData.result) : aiData.result;
    } catch (_) {
      const match = (aiData.result || "").match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { translations: {} };
    }

    return Response.json({ translations: parsed.translations || {}, cached: aiData.cached, model: aiData.model_used });
  } catch (error) {
    console.error("translateCaption error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});