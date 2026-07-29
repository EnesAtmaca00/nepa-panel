import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { recipient, subject, user_instruction } = await req.json();

    // 1. AppSettings'ten preferred_ai_provider al
    const settingsList = await base44.entities.AppSettings.list();
    const settings = settingsList[0];
    const aiProvider = settings?.preferred_ai_provider || "openai";

    // 2. AI'ya prompt gönder
    const prompt = `
      Aşağıdaki bilgilere göre profesyonel bir kurumsal e-posta taslağı oluştur.
      
      ALICI: ${recipient}
      KONU: ${subject}
      TALİMAT: ${user_instruction}
      
      KURALLAR:
      1. Kurumsal, nazik ve profesyonel bir dil kullan.
      2. Mail yapısı (Selamlama, Gövde, Kapanış) tam olsun.
      3. Sadece mail içeriğini döndür.
      
      JSON FORMATINDA DÖNDÜR:
      {
        "email_body": "yazılan mail içeriği"
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
    console.error("generateEmailDraft error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
