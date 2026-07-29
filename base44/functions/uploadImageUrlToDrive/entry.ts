// AjansPro — URL'den görsel indir ve Drive'a yükle
// Firma logosu veya AI görseli için kullanılır
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function findOrCreateSubfolder(accessToken, parentId, name) {
  const q = encodeURIComponent(`'${parentId}' in parents and name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.files?.[0]) return data.files[0];

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  return createRes.json();
}

async function makePublic(accessToken, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, image_url, filename, subfolder, source = "ai_generated" } = await req.json();
    if (!company_id || !image_url) {
      return Response.json({ error: 'company_id ve image_url zorunlu' }, { status: 400 });
    }

    const company = await base44.asServiceRole.entities.Company.get(company_id);
    if (!company?.drive_folder_id) {
      return Response.json({ error: 'Şirketin Drive klasörü yok. Önce klasör oluşturun.' }, { status: 400 });
    }

    // Görseli URL'den indir
    const imgRes = await fetch(image_url);
    if (!imgRes.ok) throw new Error(`Görsel indirilemedi: ${imgRes.status}`);
    const imgBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const finalFilename = filename || `${source}-${Date.now()}.${ext}`;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    // Alt klasör bul/oluştur
    const folderName = subfolder || (source === "ai_generated" ? "AI Görseller" : source === "logo" ? "Logolar" : "Görseller");
    const targetFolder = await findOrCreateSubfolder(accessToken, company.drive_folder_id, folderName);

    // Multipart upload
    const boundary = "ajanspro-" + Math.random().toString(36).slice(2);
    const metadata = { name: finalFilename, parents: [targetFolder.id] };
    const encoder = new TextEncoder();
    const preamble = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) + `\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
    );
    const closing = encoder.encode(`\r\n--${boundary}--`);
    const fileBytes = new Uint8Array(imgBuffer);
    const body = new Uint8Array(preamble.length + fileBytes.length + closing.length);
    body.set(preamble, 0);
    body.set(fileBytes, preamble.length);
    body.set(closing, preamble.length + fileBytes.length);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType,size",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Drive upload hatası: ${err}`);
    }

    const driveFile = await uploadRes.json();

    // Herkese açık yap
    await makePublic(accessToken, driveFile.id);

    // Önizleme URL'i — Google'ın doğrudan erişilebilir thumbnail endpoint'i
    const previewUrl = `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w800`;
    const directUrl = `https://drive.google.com/uc?export=view&id=${driveFile.id}`;

    return Response.json({
      success: true,
      drive_file_id: driveFile.id,
      drive_url: driveFile.webViewLink,
      preview_url: previewUrl,
      direct_url: directUrl,
      filename: driveFile.name,
    });

  } catch (error) {
    console.error("uploadImageUrlToDrive error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});