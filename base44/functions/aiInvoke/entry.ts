// AjansPro — Akıllı AI çağrı yönlendirici
// - Cache kontrolü
// - Provider seçimi (OpenRouter / Gemini / OpenAI / Anthropic / Base44 fallback)
// - Tasarruf modu
// - Hash bazlı önbellek
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const TASK_MODEL_MAP = {
  caption_translate: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  hashtag: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  content_idea: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  image_prompt: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  chat_simple: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  chat_complex: { gemini: "gemini-2.0-flash", openai: "gpt-4o", anthropic: "claude-sonnet-4-5", openrouter: "anthropic/claude-sonnet-4.5" },
  vision: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  monthly_report: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  audit: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  agent_chat: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  nepa_assistant: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  brand_voice: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  win_back: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  lead_outreach: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  web_architecture: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  sop_generation: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  monthly_calendar: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
  mix: { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", anthropic: "claude-haiku-4-5", openrouter: "google/gemini-2.5-flash-lite" },
};

// SORUN 1B: Task-bazlı max_tokens — yavaşlığın ana nedeni
const TASK_MAX_TOKENS = {
  content_idea: 2500,
  caption: 1000,
  caption_translate: 1200,
  hashtag: 800,
  audit: 800,
  image_prompt: 1200,
  brand_voice: 1500,
  win_back: 1000,
  lead_outreach: 1000,
  chat_simple: 1000,
  chat_complex: 2000,
  nepa_assistant: 1000,
  agent_chat: 800,
  web_architecture: 3000,
  sop_generation: 3000,
  monthly_calendar: 3000,
  mix: 3000,
  vision: 1200,
  monthly_report: 2500,
  copywriting: 2000,
};

// Modele göre dinamik timeout — yavaş/ücretsiz/devasa modellere daha çok süre tanı
function getTimeoutForModel(model) {
  const m = (model || "").toLowerCase();
  // NVIDIA Nemotron, ultra/devasa (550B/405B) ve ücretsiz katman modeller aşırı yavaş — 295sn (üst sınır)
  if (m.includes("nvidia") || m.includes("nemotron") || m.includes("550b") || m.includes("405b") || m.includes("ultra") || m.includes(":free")) {
    return 295000;
  }
  // Büyük/güçlü modeller — 150sn
  if (m.includes("sonnet") || m.includes("opus") || m.includes("gpt-4o") || m.includes("70b") || m.includes("pro")) {
    return 150000;
  }
  // Hızlı modeller (flash, lite, mini, haiku) — 60sn yeterli
  return 60000;
}

// Timeout helper — modele göre dinamik süre
async function withTimeout(promise, ms = 60000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI yanıt vermedi (${ms / 1000}sn zaman aşımı). Model çok yavaş olabilir — Ayarlar'dan daha hızlı bir model seçin.`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(apiKey, model, prompt, jsonMode, imageUrls, systemPrompt, maxTokens) {
  const parts = [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }];
  if (imageUrls?.length > 0) {
    for (const url of imageUrls) {
      try {
        const r = await fetch(url);
        const buf = await r.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const mime = r.headers.get("content-type") || "image/jpeg";
        parts.push({ inline_data: { mime_type: mime, data: b64 } });
      } catch (e) { console.error("image fetch failed", e); }
    }
  }
  const generationConfig = { maxOutputTokens: maxTokens || 800, temperature: 0.7 };
  if (jsonMode) generationConfig.responseMimeType = "application/json";
  const body = { contents: [{ parts }], generationConfig };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenRouter(apiKey, model, prompt, jsonMode, imageUrls, systemPrompt, maxTokens) {
  const content = imageUrls?.length > 0
    ? [{ type: "text", text: prompt }, ...imageUrls.map(u => ({ type: "image_url", image_url: { url: u } }))]
    : prompt;
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content });
  const body = { model, messages, max_tokens: maxTokens || 800, temperature: 0.7 };
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

async function callOpenAI(apiKey, model, prompt, jsonMode, imageUrls, systemPrompt, maxTokens) {
  const content = imageUrls?.length > 0
    ? [{ type: "text", text: prompt }, ...imageUrls.map(u => ({ type: "image_url", image_url: { url: u } }))]
    : prompt;
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content });
  const body = { model, messages, max_tokens: maxTokens || 800, temperature: 0.7 };
  if (jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(apiKey, model, prompt, jsonMode, imageUrls, systemPrompt, maxTokens) {
  const content = [];
  if (imageUrls?.length > 0) {
    for (const url of imageUrls) {
      try {
        const r = await fetch(url);
        const buf = await r.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const mime = r.headers.get("content-type") || "image/jpeg";
        content.push({ type: "image", source: { type: "base64", media_type: mime, data: b64 } });
      } catch (e) {}
    }
  }
  content.push({ type: "text", text: jsonMode ? prompt + "\n\nReturn ONLY valid JSON." : prompt });
  const anthropicBody = { model, max_tokens: maxTokens || 800, messages: [{ role: "user", content }] };
  if (systemPrompt) anthropicBody.system = systemPrompt;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(anthropicBody),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// KREDİ TASARRUFU: Base44 fallback kaldırıldı. Sadece kendi provider key'lerimiz kullanılır.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { task_type, prompt, system_prompt, json_mode, image_urls, skip_cache, provider_override, model_override, max_tokens } = await req.json();
    if (!prompt) return Response.json({ error: "prompt gerekli" }, { status: 400 });

    // Settings'i şimdi çekelim
    const settingsListEarly = await base44.asServiceRole.entities.AppSettings.list();
    const settingsEarly = settingsListEarly[0] || {};

    // SORUN 1A: Chain-of-Thought TAMAMEN kaldırıldı — system prompt'a hiçbir ek talimat eklenmez.
    // (Yavaşlığın ana nedenlerinden biriydi; AppSettings.chain_of_thought_enabled artık görmezden geliniyor.)
    const effectiveSystemPrompt = system_prompt || "";

    // 1. Cache kontrol — CoT eklenmiş prompt'la
    const sigInput = `${task_type || "default"}|${effectiveSystemPrompt}|${prompt}|${json_mode ? "json" : "text"}`;
    const cacheKey = await sha256(sigInput);

    if (!skip_cache && (!image_urls || image_urls.length === 0)) {
      const cached = await base44.asServiceRole.entities.AICache.filter({ cache_key: cacheKey }, "-created_date", 1);
      if (cached.length > 0) {
        const c = cached[0];
        if (!c.expires_at || new Date(c.expires_at) > new Date()) {
          await base44.asServiceRole.entities.AICache.update(c.id, { hit_count: (c.hit_count || 0) + 1 });
          return Response.json({ result: c.response_text, cached: true, model_used: c.model_used });
        }
      }
    }

    // 2. Settings — yukarıda zaten çekildi, alias
    const settings = settingsEarly;
    const taskKey = task_type || "chat_simple";
    const modelMap = TASK_MODEL_MAP[taskKey] || TASK_MODEL_MAP.chat_simple;

    // SORUN 1B: Task-bazlı max_tokens — caller override edebilir
    const effectiveMaxTokens = max_tokens || TASK_MAX_TOKENS[taskKey] || 800;

    // ─── MODEL SEÇİM ÖNCELİĞİ — KATI KURAL ───
    // Ayarlar'da bir global varsayılan model (default_ai_model) seçiliyse, TÜM sistemde
    // her zaman O kullanılır. Hiçbir override veya task-bazlı routing onu EZEMEZ.
    // Yalnızca global varsayılan boşsa, sıralı geri dönüş devreye girer.
    const globalDefaultModel = settings.default_ai_model || "";
    const routedModel = settings.model_routing?.[taskKey] || "";
    const chosenModel = globalDefaultModel || model_override || routedModel || "";

    // ─── PROVIDER SEÇİMİ ───
    // Eğer seçilen model OpenRouter formatındaysa (içinde "/" varsa), provider otomatik openrouter olur
    // Aksi halde kullanıcının tercih ettiği provider kullanılır
    let provider = (provider_override && provider_override !== "auto")
      ? provider_override
      : (settings.preferred_ai_provider || "openrouter");

    // OpenRouter model ID'leri "org/model" formatındadır — bunu tespit et
    if (chosenModel && chosenModel.includes("/")) {
      provider = "openrouter";
    }

    // Tasarruf modu — chat_complex için bile ucuz model (yalnızca explicit model yoksa)
    if (settings.savings_mode && taskKey === "chat_complex" && !chosenModel) {
      modelMap.openrouter = "google/gemini-2.5-flash-lite";
      modelMap.openai = "gpt-4o-mini";
      modelMap.anthropic = "claude-haiku-4-5";
      modelMap.gemini = "gemini-2.0-flash";
    }

    // 3. Provider çağrısı — 30sn timeout ile sarılı
    let result = "";
    let modelUsed = "";

    try {
      if (provider === "openrouter" && settings.openrouter_api_key) {
        modelUsed = chosenModel || modelMap.openrouter;
        result = await withTimeout(callOpenRouter(settings.openrouter_api_key, modelUsed, prompt, json_mode, image_urls, effectiveSystemPrompt, effectiveMaxTokens), getTimeoutForModel(modelUsed));
      } else if (provider === "gemini" && settings.gemini_api_key) {
        modelUsed = chosenModel || modelMap.gemini;
        result = await withTimeout(callGemini(settings.gemini_api_key, modelUsed, prompt, json_mode, image_urls, effectiveSystemPrompt, effectiveMaxTokens), getTimeoutForModel(modelUsed));
      } else if (provider === "openai" && settings.openai_api_key) {
        modelUsed = chosenModel || modelMap.openai;
        result = await withTimeout(callOpenAI(settings.openai_api_key, modelUsed, prompt, json_mode, image_urls, effectiveSystemPrompt, effectiveMaxTokens), getTimeoutForModel(modelUsed));
      } else if (provider === "anthropic" && settings.anthropic_api_key) {
        modelUsed = chosenModel || modelMap.anthropic;
        result = await withTimeout(callAnthropic(settings.anthropic_api_key, modelUsed, prompt, json_mode, image_urls, effectiveSystemPrompt, effectiveMaxTokens), getTimeoutForModel(modelUsed));
      } else {
        // Hiç key yok → Ayarlar'a yönlendir, Base44 fallback YOK
        return Response.json({
          error: `Ayarlar'da '${provider}' için API key tanımlı değil. Lütfen Ayarlar sayfasından API key gir.`
        }, { status: 400 });
      }
    } catch (err) {
      console.error("AI provider failed:", err.message, "model:", modelUsed);
      // Hata günlüğüne kaydet
      try {
        const errType = err.message?.includes("zaman aşımı") ? "timeout"
          : err.message?.toLowerCase().includes("api key") ? "no_api_key"
          : "api_error";
        await base44.asServiceRole.entities.AIErrorLog.create({
          function_name: "aiInvoke",
          task_type: taskKey,
          model_used: modelUsed || "",
          provider,
          error_message: err.message,
          error_type: errType,
          prompt_preview: (prompt || "").slice(0, 300),
          resolved: false,
        });
      } catch (logErr) { console.error("Error log write failed", logErr); }
      return Response.json({
        error: `AI çağrısı başarısız (model: ${modelUsed || "bilinmiyor"}): ${err.message}`,
        model_used: modelUsed,
      }, { status: 500 });
    }

    // SORUN 1A: CoT bloğu artık üretilmediği için strip de yok — ama eski cache veya geri dönüş için defansif temizlik
    if (result && result.includes("<think>")) {
      result = result.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    }

    // 4. Cache yaz (resim yoksa)
    if (!image_urls || image_urls.length === 0) {
      const CACHE_TTL_DAYS = {
        caption_translate: 90,
        hashtag: 60,
        content_idea: 7,
        image_prompt: 30,
        chat_simple: 1,
        chat_complex: 1,
        vision: 0,
        monthly_report: 0
      };
      const ttlDays = CACHE_TTL_DAYS[taskKey] ?? 7;

      // Maliyet tahmini
      const COST_PER_1M = {
        "gemini-2.0-flash": { input: 0.075, output: 0.3 },
        "google/gemini-2.5-flash-lite": { input: 0.075, output: 0.3 },
        "claude-haiku-4-5": { input: 1.0, output: 5.0 },
        "gpt-4o-mini": { input: 0.15, output: 0.6 },
        "gpt-4o": { input: 2.5, output: 10.0 },
        "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
      };
      const inputTokens = Math.ceil(((prompt?.length || 0) + (effectiveSystemPrompt?.length || 0)) / 4);
      const outputTokens = Math.ceil((result?.length || 0) / 4);
      const costRates = COST_PER_1M[modelUsed];
      const estimatedCost = costRates
        ? (inputTokens * costRates.input + outputTokens * costRates.output) / 1_000_000
        : 0;

      if (ttlDays > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ttlDays);
        try {
          await base44.asServiceRole.entities.AICache.create({
            cache_key: cacheKey,
            task_type: taskKey,
            prompt_signature: prompt.slice(0, 200),
            response_text: result,
            model_used: modelUsed,
            expires_at: expiresAt.toISOString(),
            hit_count: 0,
            estimated_cost_usd: estimatedCost,
          });
        } catch (e) { console.error("Cache write failed", e); }
      }

      // Bütçe kontrolü
      if (settings.monthly_ai_budget && estimatedCost > 0) {
        try {
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          const thisMonthCache = await base44.asServiceRole.entities.AICache.filter(
            { created_date: { $gte: monthStart.toISOString() } }, "-created_date", 5000
          );
          const totalSpent = thisMonthCache.reduce((s, r) => s + (r.estimated_cost_usd || 0), 0);
          const budget = settings.monthly_ai_budget;
          if (totalSpent > budget * 0.9) {
            await base44.asServiceRole.entities.Notification.create({
              type: "ai_budget_warning",
              severity: totalSpent > budget ? "critical" : "warning",
              title: totalSpent > budget
                ? `AI bütçesi aşıldı: $${totalSpent.toFixed(2)} / $${budget}`
                : `AI bütçesinin %90'ı kullanıldı: $${totalSpent.toFixed(2)} / $${budget}`,
              message: "Tasarruf modunu açmak veya bütçeyi artırmak için Ayarlar'a git",
              channels: ["in_app"],
              read: false,
            });
          }
        } catch (e) { console.error("Budget check failed", e); }
      }
    }

    return Response.json({ result, cached: false, model_used: modelUsed });
  } catch (error) {
    console.error("aiInvoke error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});