import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X } from "lucide-react";
import { SECTORS } from "@/lib/format";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function StepBasic({ data, update }) {
  const [uploading, setUploading] = useState(false);
  const [customSector, setCustomSector] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    // KREDİ TASARRUFU: Core.UploadFile yerine base64 data URL (kredi yakmaz)
    const reader = new FileReader();
    reader.onload = (ev) => {
      update({ logo_url: ev.target.result });
      toast.success("Logo yüklendi");
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Logo yüklenemedi");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-1.5">Şirket Adı *</Label>
        <Input
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Örn: Nepos Cafe"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5">Sektör</Label>
          {customSector ? (
            <div className="flex gap-2">
              <Input
                value={data.sector}
                onChange={(e) => update({ sector: e.target.value })}
                placeholder="Sektörü yazın..."
                autoFocus
              />
              <Button type="button" variant="outline" size="sm" onClick={() => { setCustomSector(false); update({ sector: "" }); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Select value={data.sector} onValueChange={(v) => { if (v === "__custom__") { setCustomSector(true); update({ sector: "" }); } else { update({ sector: v }); } }}>
              <SelectTrigger><SelectValue placeholder="Sektör seç..." /></SelectTrigger>
              <SelectContent>
                {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                <SelectItem value="__custom__">✏️ Manuel gir...</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <Label className="mb-1.5">Ülke</Label>
          <Select value={data.country} onValueChange={(v) => update({ country: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TR">🇹🇷 Türkiye</SelectItem>
              <SelectItem value="BE">🇧🇪 Belçika</SelectItem>
              <SelectItem value="OTHER">🌍 Diğer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Logo</Label>
        <div className="flex items-center gap-4">
          {data.logo_url ? (
            <div className="relative">
              <img src={data.logo_url} alt="Logo" className="w-20 h-20 rounded-xl object-cover border-2" />
              <button
                onClick={() => update({ logo_url: "" })}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div 
              className={`w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border-2 ${dragging ? 'border-gold bg-gold/5' : 'border-dashed'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleLogo(file);
              }}
            >
              ?
            </div>
          )}
          <label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleLogo(e.target.files?.[0])} 
              disabled={uploading} 
            />
            <Button type="button" variant="outline" disabled={uploading} asChild>
              <span className="cursor-pointer">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yükleniyor...</> : <><Upload className="w-4 h-4 mr-2" /> Logo Yükle</>}
              </span>
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
}