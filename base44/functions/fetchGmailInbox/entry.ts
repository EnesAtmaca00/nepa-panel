// Kullanıcının Gmail'ini okur, AI ile önem derecesi belirler
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';



function decodeBase64(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

function getHeader(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function extractBody(payload) {
  if (payload.body?.data) return decodeBase64(payload.body.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64(part.body.data);
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64(part.body.data);
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
      }
    }
  }
  return "";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Son 20 e-postayı çek (INBOX)
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&labelIds=INBOX",
      { headers: authHeader }
    );
    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) return Response.json({ emails: [] });

    // Her mesajın detayını çek
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: authHeader }
        );
        if (!res.ok) return null;
        const m = await res.json();
        const headers = m.payload?.headers || [];
        const body = extractBody(m.payload);
        return {
          id: m.id,
          subject: getHeader(headers, "Subject") || "(Konu yok)",
          from: getHeader(headers, "From"),
          date: getHeader(headers, "Date"),
          snippet: m.snippet || "",
          body: body.slice(0, 300),
          isUnread: (m.labelIds || []).includes("UNREAD"),
        };
      })
    );

    const validEmails = emailDetails.filter(Boolean);

    // AI ile önem filtresi
    const aiPrompt = `Aşağıdaki e-posta listesini değerlendir. Her biri için "importance" değerini belirle: "high" (acil/önemli), "medium" (takip gerekebilir), "low" (promosyon/bilgi amaçlı).
    
E-postalar:
${validEmails.map((e, i) => `[${i}] Gönderen: ${e.from} | Konu: ${e.subject} | Özet: ${e.snippet}`).join("\n")}

JSON olarak döndür: {"results": [{"index": 0, "importance": "high", "reason": "..."}, ...]}`;

    // KREDİ TASARRUFU: Core.InvokeLLM yerine kendi aiInvoke (kendi API key'lerimiz)
    const aiInvokeRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "completion",
      prompt: aiPrompt,
      json_mode: true,
    });
    const aiData = aiInvokeRes.data || aiInvokeRes;
    let aiParsed;
    try {
      aiParsed = typeof aiData.result === "string" ? JSON.parse(aiData.result) : aiData.result;
    } catch {
      const m = (aiData.result || "").match(/\{[\s\S]*\}/);
      aiParsed = m ? JSON.parse(m[0]) : { results: [] };
    }
    const aiResults = aiParsed?.results || [];
    const enriched = validEmails.map((email, i) => {
      const ai = aiResults.find(r => r.index === i);
      return { ...email, importance: ai?.importance || "medium", reason: ai?.reason || "" };
    });

    // Önem sırasına göre sırala
    const order = { high: 0, medium: 1, low: 2 };
    enriched.sort((a, b) => order[a.importance] - order[b.importance]);

    return Response.json({ emails: enriched });
  } catch (error) {
    console.error("fetchGmailInbox error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});