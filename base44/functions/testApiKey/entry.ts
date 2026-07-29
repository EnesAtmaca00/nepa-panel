// AjansPro — API key bağlantı testi
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { provider, api_key } = await req.json();
    if (!api_key) return Response.json({ ok: false, message: "API key boş" });

    let url, options, parseModel;

    if (provider === "gemini") {
      url = `https://generativelanguage.googleapis.com/v1beta/models?key=${api_key}`;
      options = { method: "GET" };
      parseModel = (d) => d.models?.[0]?.name || "gemini";
    } else if (provider === "openai") {
      url = "https://api.openai.com/v1/models";
      options = { headers: { Authorization: `Bearer ${api_key}` } };
      parseModel = (d) => d.data?.[0]?.id || "openai";
    } else if (provider === "anthropic") {
      url = "https://api.anthropic.com/v1/models";
      options = { headers: { "x-api-key": api_key, "anthropic-version": "2023-06-01" } };
      parseModel = (d) => d.data?.[0]?.id || "anthropic";
    } else if (provider === "openrouter") {
      url = "https://openrouter.ai/api/v1/auth/key";
      options = { headers: { Authorization: `Bearer ${api_key}` } };
      parseModel = (d) => d.data?.label || "openrouter";
    } else {
      return Response.json({ ok: false, message: "Bilinmeyen sağlayıcı" });
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      let msg = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.error?.message || j.error?.code || j.message || msg;
      } catch { /* ignore */ }
      return Response.json({ ok: false, message: msg });
    }

    const data = await res.json();
    const sample = parseModel(data);
    return Response.json({ ok: true, message: "Bağlantı başarılı", sample });
  } catch (error) {
    return Response.json({ ok: false, message: error.message || "Bağlantı hatası" });
  }
});