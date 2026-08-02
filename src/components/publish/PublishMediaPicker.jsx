// ============================================================
// Paylaşım görseli seçici.
//
// NEDEN AYRI BİR BİLEŞEN: image-studio/ImageUploader görseli base64
// data URL olarak saklıyor ("kredi tasarrufu" gerekçesiyle). Bu, AI
// stüdyosunda sorun değil — görsel yalnızca tarayıcıda gösteriliyor.
//
// AMA PAYLAŞIMDA ÇALIŞMAZ. Instagram ve Facebook görseli KENDİ
// sunucularıyla indiriyor:
//     POST /{ig-user-id}/media?image_url=...
// Meta'nın sunucusu data URL'i indiremez. LinkedIn ve TikTok için de
// aynı şey geçerli.
//
// Bu yüzden burada Supabase Storage'a yükleyip herkese açık gerçek
// adresi kullanıyoruz.
// ============================================================
import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, AlertTriangle, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

/** Platformların indirebileceği bir adres mi? */
function paylasilabilirMi(url) {
  if (!url) return true;
  return /^https:\/\//i.test(url);
}

export default function PublishMediaPicker({ value = [], onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [manuel, setManuel] = useState("");

  const urls = Array.isArray(value) ? value : (value ? [value] : []);

  const yukle = async (file) => {
    if (!file) return;
    const izinli = ["image/png", "image/jpeg", "image/webp", "video/mp4"];
    if (!izinli.includes(file.type)) {
      toast.error("PNG, JPEG, WEBP veya MP4 olmalı");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dosya 10 MB'ı aşamaz");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([...urls, file_url]);
      toast.success("Yüklendi");
    } catch (e) {
      toast.error("Yükleme hatası: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const ekleManuel = () => {
    const u = manuel.trim();
    if (!u) return;
    if (!paylasilabilirMi(u)) {
      toast.error("Adres https:// ile başlamalı — platformlar başka türlüsünü indiremiyor");
      return;
    }
    onChange([...urls, u]);
    setManuel("");
  };

  const cikar = (i) => onChange(urls.filter((_, n) => n !== i));

  const sorunlu = urls.filter((u) => !paylasilabilirMi(u));

  return (
    <div className="space-y-2">
      <Label>Görsel / Video</Label>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <div key={i} className="relative rounded border overflow-hidden group">
              {/\.mp4($|\?)/i.test(u)
                ? <video src={u} className="w-full h-24 object-cover bg-muted" />
                : <img src={u} alt="" className="w-full h-24 object-cover bg-muted" />}
              <button type="button" onClick={() => cikar(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {sorunlu.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {sorunlu.length} görsel paylaşılamaz: adresi https:// ile başlamıyor.
            Instagram ve Facebook görseli kendi sunucularıyla indiriyor, data URL
            ya da yerel dosya işe yaramaz. Dosyayı buradan yeniden yükleyin.
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <input ref={inputRef} type="file" hidden
               accept="image/png,image/jpeg,image/webp,video/mp4"
               onChange={(e) => { yukle(e.target.files?.[0]); e.target.value = ""; }} />
        <Button type="button" variant="outline" size="sm" disabled={uploading}
                onClick={() => inputRef.current?.click()} className="gap-1.5">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Dosya Yükle
        </Button>
      </div>

      <div className="flex gap-2">
        <Input value={manuel} onChange={(e) => setManuel(e.target.value)}
               placeholder="veya görsel adresi yapıştır (https://…)"
               className="text-xs"
               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ekleManuel(); } }} />
        <Button type="button" variant="outline" size="sm" onClick={ekleManuel} className="gap-1.5 shrink-0">
          <LinkIcon className="w-3.5 h-3.5" /> Ekle
        </Button>
      </div>
    </div>
  );
}
