// Mevcut Drive dosyalarını herkese açık yap
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) {
      return Response.json({ error: 'company_id gerekli' }, { status: 400 });
    }

    // Şirketin tüm dosyalarını al
    const files = await base44.asServiceRole.entities.FileItem.filter({ company_id });
    
    if (files.length === 0) {
      return Response.json({ message: 'Dosya yok', count: 0 });
    }

    // KREDİ TASARRUFU: Eski token alanı yerine ücretsiz Google Drive OAuth connector kullanılır.
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");
    
    if (!accessToken) {
      return Response.json({ error: 'Google Drive bağlı değil' }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;

    // Her dosyayı public yap
    for (const file of files) {
      if (!file.drive_file_id) continue;
      
      try {
        const permRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.drive_file_id}/permissions`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: "reader",
              type: "anyone"
            })
          }
        );
        
        if (permRes.ok) {
          successCount++;
        } else {
          errorCount++;
          console.log(`Permission error for ${file.filename}:`, await permRes.text());
        }
      } catch (err) {
        errorCount++;
        console.log(`Error for ${file.filename}:`, err);
      }
    }

    return Response.json({ 
      success: true, 
      total: files.length,
      successCount,
      errorCount,
      message: `${successCount} dosya public yapıldı, ${errorCount} hata`
    });
  } catch (error) {
    console.error("makeFilesPublic error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});