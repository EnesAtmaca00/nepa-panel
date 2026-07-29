import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // 1. fetchGmailInbox çağır (yeni mailleri çek)
    await base44.asServiceRole.functions.invoke("fetchGmailInbox", {});

    // 2. Son gelen okunmamış ve henüz "önemli" olarak işaretlenmemiş mailleri al
    const threads = await base44.entities.EmailThread.list({
      filter: { is_read: false, is_important: false },
      limit: 20
    });

    let importantCount = 0;

    for (const thread of threads) {
      // 3. AI'ya sor: "Bu mail önemli mi?"
      const prompt = `
        Aşağıdaki e-posta içeriğini analiz et ve bu mailin "önemli" olup olmadığına karar ver.
        Önemli kriterleri: Müşteri şikayeti, acil teknik sorun, yeni iş teklifi, ödeme bildirimi, kritik randevu talebi.
        
        E-POSTA:
        Konu: ${thread.subject}
        Gönderen: ${thread.sender_name}
        Özet: ${thread.snippet}
        
        JSON FORMATINDA DÖNDÜR:
        {
          "is_important": true/false,
          "reason": "neden önemli veya değil"
        }
      `;

      const aiRes = await base44.asServiceRole.functions.invoke("aiInvoke", {
        task_type: "completion",
        prompt: prompt,
        json_mode: true
      });

      if (aiRes.is_important) {
        // 4. Önemliyse güncelle
        await base44.entities.EmailThread.update(thread.id, { 
          is_important: true 
        });
        
        // Notification entity'e ekle
        await base44.entities.Notification.create({
          title: "Önemli E-posta Tespit Edildi",
          message: `${thread.sender_name}: ${thread.subject}`,
          type: "email",
          is_read: false,
          link: `/inbox-pro?id=${thread.id}`
        });

        importantCount++;
      }
    }

    return Response.json({ 
      checked_count: threads.length, 
      important_count: importantCount 
    });
  } catch (error) {
    console.error("checkImportantEmails error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
