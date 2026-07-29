import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Upload, HardDriveUpload, Check } from "lucide-react";
import { toast } from "sonner";
import BrandVoiceGuide from "./BrandVoiceGuide";

export default function TabBrandKit({ company }) {
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState(company.logo_url || "");
  const [uploading, setUploading] = useState(false);
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveUrl, setDriveUrl] = useState(company.drive_folder_url || null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["company", company.id] });
    queryClient.invalidateQueries({ queryKey: ["companies"] });
  };

  const saveLogo = useMutation({
    mutationFn: () => base44.entities.Company.update(company.id, { logo_url: logoUrl }),
    onSuccess: () => { invalidate(); toast.success("Logo kaydedildi"); },
  });

  const saveToDrive = async (url) => {
    if (!company.drive_folder_id) return;
    setDriveSaving(true);
    try {
      const res = await base44.functions.invoke("uploadImageUrlToDrive", {
        company_id: company.id,
        image_url: url,
        filename: `logo-${company.name.replace(/\s+/g, "-")}-${Date.now()}.png`,
        subfolder: "Logolar",
        source: "logo",
      });
      const data = res.data || res;
      if (data.success) {
        setDriveUrl(data.drive_url);
        toast.success("Logo Drive'a da kaydedildi");
      }
    } catch (err) {
      console.warn("Drive logo kaydı başarısız:", err.message);
    } finally {
      setDriveSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // KREDİ TASARRUFU: Drive klasörü varsa direkt Drive'a yükle (kredi yakmaz)
      // Drive klasörü yoksa base64 data URL fallback
      if (company.drive_folder_id) {
        const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = (ev) => resolve(ev.target.result.split(",")[1]);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        const res = await base44.functions.invoke("uploadFileToDrive", {
          company_id: company.id,
          category: "Logolar",
          filename: `logo-${company.name.replace(/\s+/g, "-")}-${Date.now()}.${file.name.split(".").pop()}`,
          mime_type: file.type,
          file_base64: base64,
        });
        const data = res.data || res;
        if (data.success && data.file?.drive_url) {
          setLogoUrl(data.file.drive_url);
          setDriveUrl(data.file.drive_url);
          await base44.entities.Company.update(company.id, { logo_url: data.file.drive_url });
          invalidate();
          toast.success("Logo Drive'a yüklendi");
        } else {
          throw new Error(data.error || "Drive yüklemesi başarısız");
        }
      } else {
        // Drive klasörü yok — base64 data URL ile kaydet
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = (ev) => resolve(ev.target.result);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        setLogoUrl(dataUrl);
        await base44.entities.Company.update(company.id, { logo_url: dataUrl });
        invalidate();
        toast.success("Logo kaydedildi (Drive klasörü yok)");
      }
    } catch (err) {
      toast.error("Yükleme başarısız: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Logo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <img src={logoUrl} alt={company.name} className="max-h-24 rounded-xl border-2 shadow object-contain" />
          )}
          {driveUrl && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 w-fit">
              <Check className="w-3 h-3" /> Drive'da mevcut —
              <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="underline">Klasörü Aç</a>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5">Dosya Yükle</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  id="logo-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading || driveSaving}
                  onClick={() => document.getElementById("logo-upload").click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Yükleniyor..." : "Dosya Seç"}
                </Button>
                {logoUrl && company.drive_folder_id && !driveUrl && (
                  <Button variant="outline" size="sm" className="text-blue-700 border-blue-300 gap-1"
                    onClick={() => saveToDrive(logoUrl)} disabled={driveSaving}>
                    {driveSaving ? <><span className="animate-spin">⏳</span> Kaydediliyor...</> : <><HardDriveUpload className="w-3.5 h-3.5" /> Drive'a Kaydet</>}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Logo Drive'a da otomatik kaydedilir (firmada Drive klasörü varsa)</p>
            </div>
            <div>
              <Label className="mb-1.5">veya URL ile ekle</Label>
              <div className="flex gap-2">
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <Button size="sm" onClick={() => saveLogo.mutate()} disabled={saveLogo.isPending}>
                  <Save className="w-4 h-4 mr-1" /> Kaydet
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Renk Paleti</CardTitle></CardHeader>
        <CardContent>
          {company.color_palette?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {company.color_palette.map((c, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="aspect-square rounded-xl border-2 shadow-sm" style={{ backgroundColor: c }} />
                  <div className="text-xs font-mono text-center">{c}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Renk paleti tanımlanmadı.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Marka Tanımı & Hedef Kitle</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {company.brand_description && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tanım</div>
              <p>{company.brand_description}</p>
            </div>
          )}
          {company.target_audience && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Hedef Kitle</div>
              <p>{company.target_audience}</p>
            </div>
          )}
          {company.brand_keywords?.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Anahtar Kelimeler</div>
              <div className="flex flex-wrap gap-1.5">
                {company.brand_keywords.map((k, i) => <Badge key={i} variant="secondary">{k}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BrandVoiceGuide company={company} />
    </div>
  );
}