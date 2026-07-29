import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ExternalLink, FileIcon, Loader2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/format";
import { getDriveThumbnailUrl } from "@/lib/driveUtils";
import { toast } from "sonner";

const CATEGORIES = [
  "Logolar", "Marka Kit", "Sosyal Medya", "Reklamlar", "Tasarımlar",
  "Mockuplar", "Tekrarlayan İçerikler", "Özel Gün Tasarımları",
  "Web Sitesi", "Brief & Sözleşme", "Aylık Raporlar",
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TabFiles({ company }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[2]);
  const [uploading, setUploading] = useState(false);

  const { data: files = [] } = useQuery({
    queryKey: ["files", company.id],
    queryFn: () => base44.entities.FileItem.filter({ company_id: company.id }, "-created_date", 200),
    initialData: [],
  });

  const handleUpload = async (e) => {
    const filesList = Array.from(e.target.files || []);
    if (filesList.length === 0) return;

    if (!company.drive_folder_id) {
      toast.error("Bu şirketin Drive klasörü yok. Şirket ayarlarından oluşturabilirsin.");
      return;
    }

    setUploading(true);
    let success = 0;
    for (const file of filesList) {
      try {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name}: 25MB üstü dosyalar desteklenmiyor`);
          continue;
        }
        const base64 = await fileToBase64(file);
        await base44.functions.invoke("uploadFileToDrive", {
          company_id: company.id,
          category,
          filename: file.name,
          mime_type: file.type,
          file_base64: base64,
        });
        success++;
      } catch (err) {
        console.error(err);
        toast.error(`${file.name} yüklenemedi`);
      }
    }
    if (success > 0) toast.success(`${success} dosya Drive'a yüklendi`);
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["files", company.id] });
    e.target.value = "";
  };

  const grouped = files.reduce((acc, f) => {
    const cat = f.category || "Genel";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {!company.drive_folder_id ? (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-sm">Bu müşterinin Drive klasörü henüz yok. Ayarlar tabından oluşturabilirsin.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Dosya Yükle</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex-1">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <Button asChild disabled={uploading} className="w-full">
                  <span className="cursor-pointer">
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yükleniyor...</> : <><Upload className="w-4 h-4 mr-2" /> Dosya Seç</>}
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Dosyalar doğrudan Drive'a yüklenir. Maksimum 25MB / dosya.</p>
          </CardContent>
        </Card>
      )}

      {files.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            Henüz dosya yüklenmedi.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{cat} ({items.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {items.map(f => {
                  const thumbnailUrl = getDriveThumbnailUrl(f.drive_url) || f.thumbnail_url;
                  const isImage = f.mime_type?.startsWith('image/');
                  
                  return (
                    <a
                      key={f.id}
                      href={f.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col gap-1 p-2 rounded-lg border hover:border-gold hover:shadow-md transition-all"
                    >
                      {isImage && thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={f.filename} className="aspect-square rounded object-cover bg-muted" />
                      ) : (
                        <div className="aspect-square rounded bg-muted flex items-center justify-center">
                          <FileIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="text-xs font-medium truncate">{f.filename}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {formatDate(f.created_date)} <ExternalLink className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-100" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}