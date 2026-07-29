// AjansPro — Şirket için Drive klasör yapısı oluşturur
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUBFOLDERS = [
  "Logolar",
  "Marka Kit",
  "Sosyal Medya",
  "Reklamlar",
  "Tasarımlar",
  "Mockuplar",
  "Tekrarlayan İçerikler",
  "Özel Gün Tasarımları",
  "Web Sitesi",
  "Brief & Sözleşme",
  "Aylık Raporlar",
];

async function driveCreateFolder(accessToken, name, parentId) {
  const body = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) body.parents = [parentId];

  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive klasör oluşturma hatası: ${err}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, company_name } = await req.json();
    if (!company_name) return Response.json({ error: 'company_name gerekli' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    // 1. AjansPro root klasörü (varsa kullan, yoksa oluştur)
    const settingsList = await base44.asServiceRole.entities.AppSettings.list();
    let settings = settingsList[0];
    let rootId = settings?.drive_root_folder_id;

    if (!rootId) {
      const root = await driveCreateFolder(accessToken, "AjansPro", null);
      rootId = root.id;
      const rootUrl = root.webViewLink;
      if (settings) {
        await base44.asServiceRole.entities.AppSettings.update(settings.id, {
          drive_root_folder_id: rootId,
          drive_root_folder_url: rootUrl,
        });
      } else {
        settings = await base44.asServiceRole.entities.AppSettings.create({
          drive_root_folder_id: rootId,
          drive_root_folder_url: rootUrl,
        });
      }
    }

    // 2. Şirket klasörü
    const companyFolder = await driveCreateFolder(accessToken, company_name, rootId);

    // 3. Alt klasörler
    for (const sub of SUBFOLDERS) {
      await driveCreateFolder(accessToken, sub, companyFolder.id);
    }

    // 4. Şirket entity'sini güncelle
    if (company_id) {
      await base44.asServiceRole.entities.Company.update(company_id, {
        drive_folder_id: companyFolder.id,
        drive_folder_url: companyFolder.webViewLink,
      });
    }

    return Response.json({
      success: true,
      drive_folder_id: companyFolder.id,
      drive_folder_url: companyFolder.webViewLink,
    });
  } catch (error) {
    console.error("createCompanyDriveFolder error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});