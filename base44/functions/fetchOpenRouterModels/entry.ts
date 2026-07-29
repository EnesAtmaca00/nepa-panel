import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    const settings = settingsList[0] || {};

    const result = { openrouter: [], gemini: [], openai: [], anthropic: [] };

    // OpenRouter modelleri
    if (settings.openrouter_api_key) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { "Authorization": `Bearer ${settings.openrouter_api_key}` }
        });
        if (res.ok) {
          const data = await res.json();
          result.openrouter = (data.data || [])
            .filter(m => m.id && m.name && parseFloat(m.pricing?.prompt || "0") >= 0)
            .map(m => {
              const inputPrice = parseFloat(m.pricing?.prompt || "0") * 1_000_000;
              const outputPrice = parseFloat(m.pricing?.completion || "0") * 1_000_000;
              const avgPrice = (inputPrice + outputPrice) / 2;

              let tier = "free";
              if (avgPrice > 20) tier = "ultra";
              else if (avgPrice > 5) tier = "premium";
              else if (avgPrice > 1) tier = "standard";
              else if (avgPrice > 0) tier = "cheap";

              return {
                id: m.id,
                name: m.name,
                context_length: m.context_length || 0,
                input_price: inputPrice,
                output_price: outputPrice,
                tier,
                provider: "openrouter",
              };
            })
            .sort((a, b) => a.input_price - b.input_price);
        }
      } catch (e) {
        console.error("OpenRouter models fetch failed:", e.message);
      }
    }

    // Gemini modelleri (statik liste)
    if (settings.gemini_api_key) {
      result.gemini = [
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "free", input_price: 0, output_price: 0, provider: "gemini" },
        { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", tier: "free", input_price: 0, output_price: 0, provider: "gemini" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "cheap", input_price: 0.15, output_price: 0.6, provider: "gemini" },
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "standard", input_price: 1.25, output_price: 10, provider: "gemini" },
      ];
    }

    // OpenAI modelleri (statik liste)
    if (settings.openai_api_key) {
      result.openai = [
        { id: "gpt-4o-mini", name: "GPT-4o Mini", tier: "cheap", input_price: 0.15, output_price: 0.6, provider: "openai" },
        { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", tier: "cheap", input_price: 0.4, output_price: 1.6, provider: "openai" },
        { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", tier: "cheap", input_price: 0.1, output_price: 0.4, provider: "openai" },
        { id: "gpt-4o", name: "GPT-4o", tier: "standard", input_price: 2.5, output_price: 10, provider: "openai" },
        { id: "o3", name: "O3", tier: "ultra", input_price: 10, output_price: 40, provider: "openai" },
        { id: "o3-mini", name: "O3 Mini", tier: "standard", input_price: 1.1, output_price: 4.4, provider: "openai" },
      ];
    }

    // Anthropic modelleri (statik liste)
    if (settings.anthropic_api_key) {
      result.anthropic = [
        { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", tier: "cheap", input_price: 0.8, output_price: 4, provider: "anthropic" },
        { id: "claude-sonnet-4", name: "Claude Sonnet 4", tier: "standard", input_price: 3, output_price: 15, provider: "anthropic" },
        { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", tier: "premium", input_price: 3, output_price: 15, provider: "anthropic" },
        { id: "claude-opus-4", name: "Claude Opus 4", tier: "ultra", input_price: 15, output_price: 75, provider: "anthropic" },
      ];
    }

    return Response.json({
      models: result,
      connected_providers: Object.keys(result).filter(k => result[k].length > 0),
      total_count: Object.values(result).reduce((s, arr) => s + arr.length, 0),
    });
  } catch (error) {
    console.error("fetchOpenRouterModels error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});