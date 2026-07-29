// Ne-Pa Panel — AI Görsel Prompt Üreticisi (Content-Only + Deterministik Montaj)
// Mimari: LLM SADECE yaratıcı sahne içeriğini üretir (JSON). Kamera, ışık, HEX renk,
// stil, blok sırası, negatif prompt ve sanitizasyon TAMAMEN kodda yapılır.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ━━━ KOD-SAHİBİ SÖZLÜKLER — kamera / ışık / stil-kalite ━━━
const styleCameraMap = {
  "fotoğraf gerçekçi": "shot on a full-frame DSLR, 50mm lens, f/2.8 aperture, shallow depth of field, natural skin and surface textures, subtle film grain",
  "cinematic": "cinematic 35mm anamorphic film look, wide aperture, soft background bokeh, filmic color contrast, gentle lens flare",
  "3d render": "high-end octane 3d render, physically based materials, ambient occlusion, soft global illumination",
  "illüstrasyon": "clean modern digital illustration, confident linework, flat shading with subtle gradients",
  "minimal vektörel": "minimal flat vector illustration, geometric precision, generous negative space",
  "watercolor": "soft watercolor painting, organic bleeding edges, textured paper grain",
  "y2k": "y2k aesthetic, glossy chrome, vibrant gradients, retro-futuristic styling",
  "retro": "retro vintage aesthetic, faded analog color, period-accurate styling",
  default: "shot on a full-frame DSLR, 50mm lens, f/2.8 aperture, shallow depth of field, natural realistic textures",
};

const moodLightMap = {
  "parlak": "bright clean high-key lighting",
  "soft": "soft diffused window light",
  "dramatic": "dramatic low-key side lighting with deep shadows",
  "lüks": "elegant directional lighting with rich highlights",
  "sıcak": "warm golden hour light",
  "soğuk": "cool blue-toned ambient light",
  "minimal": "even soft shadowless lighting",
  "bold": "high-contrast punchy lighting",
  "vintage": "warm nostalgic backlight",
  "modern": "balanced studio lighting",
  "elegant": "soft refined key light with gentle falloff",
  "playful": "bright colorful even lighting",
  "profesyonel": "professional softbox studio lighting",
  "energetic": "vivid high-energy lighting",
  "calm": "gentle muted natural light",
  "mysterious": "moody atmospheric low light",
  "romantic": "warm soft romantic glow",
  "futuristic": "cool neon accent lighting",
  default: "balanced natural lighting",
};

const styleQualityMap = {
  "fotoğraf gerçekçi": "photorealistic high detail, professional photography, 4k, sharp focus, authentic photographic detail, natural depth of field",
  "cinematic": "cinematic photographic detail, professional color grading, 4k, sharp focus on subject",
  "3d render": "high quality 3d render, crisp clean rendering, sharp detail",
  "illüstrasyon": "crisp clean illustration, sharp linework, high detail",
  "minimal vektörel": "crisp clean vector rendering, sharp geometric detail",
  "watercolor": "rich watercolor texture, crisp clean rendering",
  "y2k": "crisp clean rendering, vibrant detail",
  "retro": "crisp clean rendering, authentic period detail",
  default: "high detail, professional quality, 4k, sharp focus",
};

// ━━━ NEGATİF PROMPT — kodda sıfırdan kurulur ━━━
const BASE_NEGATIVE = [
  "blurry", "low quality", "deformed", "disfigured", "extra limbs",
  "bad anatomy", "watermark", "jpeg artifacts", "oversaturated",
  "wrong scale", "floating subject", "inconsistent perspective",
];

function buildNegative(data, isPhoto) {
  const neg = [...BASE_NEGATIVE];
  if (isPhoto) neg.push("3d render", "cgi", "plastic skin", "over-smoothed", "artificial gloss");

  // Text istenmediyse — tüm yazı varyantlarını yasakla
  if (!data.include_text) {
    neg.push("text", "letters", "typography", "captions", "words", "writing");
  } else {
    neg.push("gibberish text", "misspelled words", "random letters");
  }

  // Logo istenmediyse — yasakla
  if (!data.include_logo) {
    neg.push("logo", "brand mark", "emblem", "trademark");
  } else {
    neg.push("distorted logo", "unreadable brand mark");
  }

  return [...new Set(neg)].join(", ");
}

// ━━━ Tip normalizasyonu — zayıf modeller string yerine obje/array döndürebilir ━━━
function toText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(", ");
  if (typeof v === "object") {
    // Obje {anahtar: değer} ise "değer (anahtar)" olarak bağlamı koru — örn. {ship:"background"} -> "ship in the background"
    return Object.entries(v).map(([k, val]) => {
      const t = toText(val);
      if (!t) return "";
      // değer bir derinlik katmanıysa anlamlı cümle kur
      if (/^(foreground|mid-?ground|background|far|near)$/i.test(t)) return `${k} in the ${t}`;
      return `${k} ${t}`;
    }).filter(Boolean).join(", ");
  }
  return String(v);
}
function toArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(toText).filter(Boolean);
  if (typeof v === "object") return Object.values(v).map(toText).filter(Boolean);
  return [toText(v)].filter(Boolean);
}

// ━━━ DETERMİNİSTİK MONTAJ — final prompt kodda sabit sırayla kurulur ━━━
function assembleFinalPrompt(content, hexes, style, mood) {
  const blocks = [];

  // 1 SUBJECT
  blocks.push(toText(content.subject));

  // 2 DETAILS
  const details = toArray(content.details);
  if (details.length) blocks.push(details.join(", "));

  // 3 ENVIRONMENT (+ çok özneli sahnede ölçek zorlaması)
  let env = toText(content.environment);
  if (content.is_multi_subject) {
    env += ", consistent realistic scale and perspective";
    const sn = toText(content.scale_notes);
    if (sn) env += ", " + sn;
  }
  if (env) blocks.push(env);

  // 4 COMPOSITION
  const comp = toText(content.composition);
  if (comp) blocks.push(comp);

  // 5 CAMERA (koddan — LLM'den asla)
  blocks.push(styleCameraMap[style] || styleCameraMap.default);

  // 6 LIGHTING (koddan)
  blocks.push(moodLightMap[mood] || moodLightMap.default);

  // 7 COLOR (paletten doğrudan deterministik HEX enjeksiyonu)
  if (hexes.length) blocks.push("strict brand color palette " + hexes.join(" "));

  // 8 LOGO / TEXT pozitif uzamsal kısıtlamalar
  const logoIns = toText(content.logo_instruction);
  const textIns = toText(content.text_instruction);
  if (logoIns) blocks.push(logoIns);
  if (textIns) blocks.push(textIns);

  // 9 STYLE & QUALITY (koddan)
  blocks.push(styleQualityMap[style] || styleQualityMap.default);

  return blocks
    .filter(Boolean)
    .join(", ")
    .replace(/[\{\}\[\]"]/g, "")   // yasaklı karakter temizliği
    .replace(/\s*,\s*,/g, ", ")    // çift virgül daralt
    .replace(/\s+/g, " ")
    .trim();
}

// ━━━ İÇERİK DOĞRULAMA — tip normalizasyonundan SONRA çalışır ━━━
function validateContent(c, data) {
  const errors = [];
  if (!c || typeof c !== "object") { errors.push("content is not an object"); return errors; }
  if (!toText(c.subject) || toText(c.subject).length < 3) errors.push("subject missing or too short");
  const moodArr = toArray(c.mood);
  if (moodArr.length < 2 || moodArr.length > 3) errors.push("mood must contain 2-3 adjectives");
  if (c.is_multi_subject && !toText(c.scale_notes))
    errors.push("multi-subject scene is missing scale_notes");
  if (data.include_logo && !toText(c.logo_instruction))
    errors.push("logo requested but logo_instruction is empty");
  if (data.include_text && !toText(c.text_instruction))
    errors.push("text requested but text_instruction is empty");
  return errors;
}

// ━━━ CONTENT-ONLY SYSTEM PROMPT ━━━
const CONTENT_SYSTEM_PROMPT = `You are a scene-content extractor for an image-prompt engine.
You DO NOT write the final prompt. You ONLY return structured scene content as JSON.
Camera, lighting, brand color (HEX), and style modifiers are added later by the engine, NOT by you.

TASK: Read the user's raw request and the brand context, then return ONLY the creative
scene content matching the provided JSON schema.

RULES:
- Return ONLY valid JSON. No prose, no markdown, no code fences.
- subject: one concrete, physical main subject and any interactions. Be specific.
- details: 1-3 unique props, actions or expressions (array of strings).
- environment: describe spatial relationships. Assign EVERY subject to exactly ONE depth
  layer: foreground, mid-ground, or background.
- composition: exactly ONE framing technique (e.g. "rule of thirds", "centered symmetry").
- mood: exactly 2-3 adjectives (array of strings).
- is_multi_subject: true if two or more distinct subjects share the scene.
- scale_notes: if multi-subject, ONE sentence enforcing consistent realistic scale and
  perspective between the named subjects (e.g. why the distant object looks small).
  Empty string if single subject.
- logo_instruction: if a logo is requested, "a simple abstract brand mark, no legible
  letters" plus where it sits in the scene. Empty string otherwise.
- text_instruction: if text is requested, the exact words to render "large, legible,
  high contrast" plus where it sits. Empty string otherwise.
- NEVER mention HEX colors, lenses, apertures, lighting gear or style modifiers.
- NEVER use braces, brackets or double quotes inside any string value.

Return JSON with EXACTLY these keys: subject (string), details (array), environment (string),
composition (string), mood (array), is_multi_subject (boolean), scale_notes (string),
logo_instruction (string), text_instruction (string).`;

// Few-shot örnekleri — tutarlılığı en çok artıran katman
const FEW_SHOT = `EXAMPLE 1 — single subject
Input: "kahve fincanı" | brand: cozy cafe | style: photorealistic | mood: cozy
Output:
{"subject":"a single ceramic coffee cup filled with freshly brewed espresso on a wooden table","details":["a thin wisp of steam rising from the surface","a few roasted beans beside the saucer"],"environment":"the cup sits in sharp foreground, a softly blurred warm cafe interior in the background","composition":"rule of thirds","mood":["cozy","inviting","warm"],"is_multi_subject":false,"scale_notes":"","logo_instruction":"","text_instruction":""}

EXAMPLE 2 — multi subject (scale problem)
Input: "rıhtımda duran bir çocuk ve arkada büyük bir gemi"
Output:
{"subject":"a young child standing on a stone harbor pier looking out at the water","details":["the child wears a light jacket","one hand shielding eyes from the sun"],"environment":"the child in the foreground on the pier, a large cargo ship far away in the background out on the open sea","composition":"rule of thirds","mood":["calm","contemplative","open"],"is_multi_subject":true,"scale_notes":"the ship is distant so it should read as physically large yet appear smaller than the foreground child because of perspective and distance","logo_instruction":"","text_instruction":""}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const company = await base44.asServiceRole.entities.Company.get(data.company_id);
    if (!company) return Response.json({ error: "Şirket bulunamadı" }, { status: 404 });

    // ━━━ Bağlam Toplama (yalnızca yaratıcı içerik için — HEX/kamera DEĞİL) ━━━
    const [styleResults, baglamResults] = await Promise.all([
      data.use_style_memory
        ? base44.asServiceRole.entities.StyleMemory.filter({ company_id: data.company_id }, "-updated_date", 1).catch(() => [])
        : Promise.resolve([]),
      base44.asServiceRole.entities.FirmaBaglamHafizasi.filter({ company_id: data.company_id }, "-updated_date", 1).catch(() => []),
    ]);
    const styleMemory = styleResults[0] || null;
    const firmaBaglam = baglamResults[0] || null;

    // HEX paleti — KODDA montajda enjekte edilecek (LLM görmez)
    const hexes = (data.color_overrides?.length > 0 ? data.color_overrides : company.color_palette || []).slice(0, 4);

    // Stil / mood anahtarları (sözlük eşleşmesi için normalize)
    const style = (data.style || "fotoğraf gerçekçi").toLowerCase().trim();
    const mood = (data.mood || "profesyonel").toLowerCase().trim();
    const styleLower = style;
    const isPhoto = /foto|gerçek|photo|cinematic|realistic/.test(styleLower) || !styleLower;

    // ━━━ Yaratıcı bağlam metni (sadece ton/sektör — HEX/teknik terim YOK) ━━━
    const brandContext = [];
    brandContext.push(`Brand: ${company.name}`);
    if (company.sector) brandContext.push(`Sector: ${company.sector}`);
    if (company.brand_description) brandContext.push(`Brand Identity: ${company.brand_description}`);
    if (company.target_audience) brandContext.push(`Target Audience: ${company.target_audience}`);
    if (company.brand_keywords?.length) brandContext.push(`Brand Keywords: ${company.brand_keywords.join(", ")}`);
    if (styleMemory?.mood_tags?.length) brandContext.push(`Brand Mood: ${styleMemory.mood_tags.join(", ")}`);
    if (styleMemory?.common_elements?.length) brandContext.push(`Recurring Visual Elements: ${styleMemory.common_elements.join(", ")}`);
    if (firmaBaglam?.zenginlestirme_verisi?.one_cikan_deger_onerisi)
      brandContext.push(`Value Proposition: ${firmaBaglam.zenginlestirme_verisi.one_cikan_deger_onerisi}`);

    // ━━━ Content-only LLM çağrısı ━━━
    const buildUserPrompt = (repairNote = "") => `${FEW_SHOT}

━━━ NOW PROCESS THIS REQUEST ━━━
Raw request (may be Turkish): "${data.topic || ""}"
Style hint: ${data.style || "photorealistic"}
Mood hint: ${data.mood || "professional"}
${data.include_logo ? "A logo IS requested — fill logo_instruction." : "No logo — logo_instruction must be empty."}
${data.include_text ? `Text IS requested, exact words: "${data.text_content || ""}" — fill text_instruction.` : "No text — text_instruction must be empty."}

Brand context (for tone only, do NOT list literally, do NOT add colors):
${brandContext.join("\n")}
${repairNote ? `\nYour previous JSON failed these checks, fix ONLY them and return JSON again: ${repairNote}` : ""}

Return ONLY the JSON object with the 9 required keys.`;

    const callContent = async (repairNote = "") => {
      const r = await base44.functions.invoke("aiInvoke", {
        task_type: "image_prompt",
        prompt: buildUserPrompt(repairNote),
        system_prompt: CONTENT_SYSTEM_PROMPT,
        json_mode: true,
        skip_cache: !!repairNote, // retry'da cache'i atla
        provider_override: data.generator_provider,
        model_override: data.selected_model || undefined,
      });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      let parsed;
      try { parsed = typeof d.result === "string" ? JSON.parse(d.result) : d.result; }
      catch (_) { const m = (d.result || "").match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
      return { parsed, model: d.model_used, cached: d.cached };
    };

    // İlk çağrı
    let { parsed: content, model: modelUsed, cached } = await callContent();
    let errors = content ? validateContent(content, data) : ["no valid JSON returned"];

    // Tek seferlik repair retry
    let repaired = false;
    if (errors.length) {
      try {
        const retry = await callContent(errors.join("; "));
        const retryErrors = retry.parsed ? validateContent(retry.parsed, data) : ["retry produced no JSON"];
        if (retryErrors.length < errors.length || retryErrors.length === 0) {
          content = retry.parsed;
          modelUsed = retry.model;
          cached = retry.cached;
          errors = retryErrors;
          repaired = true;
        }
      } catch (_) { /* retry başarısızsa ilk içerikle devam */ }
    }

    if (!content || !content.subject) {
      return Response.json({ error: "AI geçerli sahne içeriği üretemedi. Lütfen tekrar deneyin veya daha açık bir konu yazın." }, { status: 502 });
    }

    // ━━━ DETERMİNİSTİK MONTAJ — final prompt ve negatif kodda kurulur ━━━
    const englishPrompt = assembleFinalPrompt(content, hexes, style, mood);
    const negativePrompt = buildNegative(data, isPhoto);

    // Türkçe açıklama (montaj edilmiş içerikten kodda üretilir — ekstra LLM çağrısı YOK)
    const turkishParts = [];
    turkishParts.push(toText(content.subject));
    const detailsTr = toArray(content.details);
    if (detailsTr.length) turkishParts.push(detailsTr.join(", "));
    const envTr = toText(content.environment);
    if (envTr) turkishParts.push(envTr);
    if (hexes.length) turkishParts.push(`Marka renkleri: ${hexes.join(", ")}`);
    const turkishPrompt = `Sahne: ${turkishParts.filter(Boolean).join(" — ")}. Ruh hali: ${toArray(content.mood).join(", ")}.`;

    const refinementNote = repaired ? "İçerik doğrulamadan geçirilip onarıldı." : "";

    return Response.json({
      turkish_prompt: turkishPrompt,
      english_prompt: englishPrompt,
      final_prompt: englishPrompt,
      negative_prompt: negativePrompt,
      usage_tip: `Bu prompt deterministik montajla üretildi — marka renkleri (${hexes.join(", ") || "yok"}) ve kamera/ışık her seferinde sabittir.`,
      palette_warning: "",
      refined_topic: "",
      refinement_note: refinementNote,
      content_blocks: content, // debug/şeffaflık için ham içerik
      cached,
      model: modelUsed,
    });
  } catch (error) {
    console.error("generateImagePrompt error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});