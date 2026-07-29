import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { email_thread_id, user_instruction } = await req.json();

    // 1. EmailThread'i oku
    const thread = await base44.entities.EmailThread.get(email_thread_id);
    if (!thread) {
      return Response.json({ error: "Email thread not found" }, { status: 404 });
    }

    // 2. AppSettings'ten preferred_ai_provider al
    const settingsList = await base44.entities.AppSettings.list();
    const settings = settingsList[0];
    const aiProvider = settings?.preferred_ai_provider || "openai";

    // 3. AI'ya prompt gönder
    const prompt = `
      Aşağıdaki e-posta içeriğine göre bir yanıt taslağı oluştur.
      
      E-POSTA İÇERİĞİ:
      Konu: ${thread.subject}
      Gönderen: ${thread.sender_name} (${thread.sender_email})
      İçerik: ${thread.body_text || thread.snippet}
      
      KULLANICI TALİMATI:
      ${user_instruction}
      
      KURALLAR:
      1. Gelen mailin dilini tespit et.
      2. Yanıtı aynı dilde yaz.
      3. Eğer yanıt Türkçe değilse, yanıtın Türkçe çevirisini de yap.
      4. Yanıt kurumsal ve profesyonel bir dilde olmalı.
      
      JSON FORMATINDA DÖNDÜR:
      {
        "reply_text": "yazılan yanıt",
        "detected_language": "dil kodu (en, tr, de vb.)",
        "turkish_translation": "eğer dil Türkçe değilse çevirisi, Türkçe ise null"
      }
    `;

    const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
      task_type: "completion",
      prompt: prompt,
      json_mode: true,
      model_override: aiProvider === "openai" ? "openai/gpt-4o" : undefined
    });

    return Response.json(aiRes);
  } catch (error) {
    console.error("generateEmailReply error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
