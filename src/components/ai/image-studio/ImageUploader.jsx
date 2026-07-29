import React, { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ImageUploader({ value, onChange, label = "Görsel yükle" }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Lütfen bir görsel seç");
      return;
    }
    setUploading(true);
    try {
      // KREDİ TASARRUFU: Core.UploadFile yerine base64 data URL kullan (kredi yakmaz)
      const reader = new FileReader();
      reader.onload = (ev) => {
        onChange(ev.target.result);
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error("Dosya okunamadı");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      toast.error("Yükleme hatası: " + e.message);
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  if (value) {
    return (
      <div className="relative rounded-[10px] overflow-hidden border" style={{ borderColor: "hsl(var(--border-default))" }}>
        <img src={value} alt="Yüklenen görsel" className="w-full max-h-64 object-contain bg-muted" />
        <button
          onClick={() => onChange("")}
          className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background border"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[10px] border-2 border-dashed flex flex-col items-center justify-center gap-2 py-10 cursor-pointer transition-colors ${
        dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 hover:bg-muted/30"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files[0] && upload(e.target.files[0])}
      />
      {uploading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor...</div>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">Sürükle-bırak veya tıkla</div>
        </>
      )}
    </div>
  );
}