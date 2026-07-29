// AjansPro — Şirket Drive klasörünün belirli bir alt klasörüne dosya yükler
// Frontend base64 olarak dosyayı gönderir
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function findSubfolder(accessToken, parentId, name) {
  const q = encodeURIComponent(`'${parentId}' in parents and name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0] || null;
}

async function createSubfolder(accessToken, parentId, name) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!res.ok) throw new Error("Alt klasör oluşturulamadı");
  return res.json();
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, category, filename, mime_type, file_base64 } = await req.json();
    if (!company_id || !filename || !file_base64) {
      return Response.json({ error: 'Eksik alan: company_id, filename, file_base64' }, { status: 400 });
    }

    const company = await base44.asServiceRole.entities.Company.get(company_id);
    if (!company?.drive_folder_id) {
      return Response.json({ error: 'Şirketin Drive klasörü yok' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    // Hedef alt klasörü bul/oluştur
    let targetFolderId = company.drive_folder_id;
    if (category) {
      let sub = await findSubfolder(accessToken, company.drive_folder_id, category);
      if (!sub) sub = await createSubfolder(accessToken, company.drive_folder_id, category);
      targetFolderId = sub.id;
    }

    // Multipart upload
    const fileBytes = base64ToUint8Array(file_base64);
    const boundary = "ajanspro-boundary-" + Math.random().toString(36).slice(2);
    const metadata = {
      name: filename,
      parents: [targetFolderId],
    };

    const encoder = new TextEncoder();
    const preamble = encoder.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) + `\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mime_type || "application/octet-stream"}\r\n\r\n`
    );
    const closing = encoder.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(preamble.length + fileBytes.length + closing.length);
    body.set(preamble, 0);
    body.set(fileBytes, preamble.length);
    body.set(closing, preamble.length + fileBytes.length);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink,mimeType,size",
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

    // Dosyayı herkese açık yap (public read access)
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone"
        })
      });
    } catch (permErr) {
      console.log("Permission error (non-critical):", permErr);
    }

    // Drive thumbnail URL oluştur (Google bazen thumbnailLink döndürmüyor)
    const thumbnailUrl = driveFile.thumbnailLink || 
      (driveFile.mimeType?.startsWith('image/') 
        ? `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w1000` 
        : '');

    // Metadata'yı DB'ye kaydet
    const fileItem = await base44.asServiceRole.entities.FileItem.create({
      company_id,
      category: category || "Genel",
      filename: driveFile.name,
      drive_file_id: driveFile.id,
      drive_url: driveFile.webViewLink,
      thumbnail_url: thumbnailUrl,
      mime_type: driveFile.mimeType,
      size_kb: driveFile.size ? Math.round(parseInt(driveFile.size) / 1024) : 0,
    });

    return Response.json({ success: true, file: fileItem });
  } catch (error) {
    console.error("uploadFileToDrive error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});