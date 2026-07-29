import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Download, ExternalLink, HardDriveUpload, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SIZES = [
  { label: "1:1 (1024×1024)", w: 1024, h: 1024 },
  { label: "4:5 (864×1080)", w: 864, h: 1080 },
  { label: "9:16 (576×1024)", w: 576, h: 1024 },
  { label: "16:9 (1024×576)", w: 1024, h: 576 },
  { label: "3:2 (1024×682)", w: 1024, h: 682 },
];

const MODELS = [
  { value: "flux", label: "Flux (Önerilen)" },
  { value: "flux-realism", label: "Flux Realism" },
  { value: "flux-pro", label: "Flux Pro" },
  { value: "turbo", label: "Turbo (Hızlı)" },
];

export default function ModeDirectGenerate({ companyId, companies = [] }) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [model, setModel] = useState("flux");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [driveUrl, setDriveUrl] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || "");

  const selectedSize = SIZES.find((s) => `${s.w}x${s.h}` === size) || SIZES[0];
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const generate = async () => {
    if (!prompt.trim()) { toast.error("Prompt yaz"); return; }
    setLoading(true);
    setImageUrl("");
    setDriveUrl(null);
    const seed = Math.floor(Math.random() * 9999999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${selectedSize.w}&height=${selectedSize.h}&model=${model}&nologo=true&seed=${seed}&enhance=true`;
    setImageUrl(url);
    setLoading(false);
  };

  const saveToDrive = async () => {
    if (!imageUrl || !selectedCompanyId) {
      toast.error("Drive'a kaydetmek için firma seçin");
      return;
    }
    if (!selectedCompany?.drive_folder_id) {
      toast.error("Seçilen firmanın Drive klasörü yok");
      return;
    }
    setSavingToDrive(true);
    try {
      const res = await base44.functions.invoke("uploadImageUrlToDrive", {
        company_id: selectedCompanyId,
        image_url: imageUrl,
        filename: `AI-Gorsel-${Date.now()}.jpg`,
        subfolder: "AI Görseller",
        source: "ai_generated",
      });
      const data = res.data || res;
      if (!data.success) throw new Error(data.error || "Yükleme başarısız");
      setDriveUrl(data.drive_url);

      // MediaAsset'e kaydet
      await base44.entities.MediaAsset.create({
        company_id: selectedCompanyId,
        company_name: selectedCompany.name,
        file_url: data.direct_url,
        thumbnail_url: data.preview_url,
        file_type: "image",
        source: "ai_generated",
        title: `AI Görsel — ${new Date().toLocaleDateString("tr")}`,
        category: "graphic",
        tags: ["ai", "pollinations"],
        ai_prompt: prompt.slice(0, 500),
      });

      toast.success("Drive'a kaydedildi!");
    } catch (err) {
      toast.error("Drive hatası: " + err.message);
    } finally {
      setSavingToDrive(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="surface-sunken text-sm space-y-1">
        <p className="font-medium">Pollinations.ai — Ücretsiz Görsel Üretimi</p>
        <p className="text-muted-foreground text-xs">API key veya kredi gerektirmez. Flux modeli ile üretir.</p>
      </div>

      {companies.length > 0 && (
        <div>
          <label className="text-[13px] font-medium text-secondary mb-1.5 block">Firma (Drive'a kaydetmek için)</label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Firma seç (opsiyonel)" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-[13px] font-medium text-secondary mb-1.5 block">Prompt (İngilizce önerilir)</label>
        <textarea
          className="w-full rounded-[8px] border px-3 py-2.5 text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-accent"
          style={{ borderColor: "hsl(var(--border))", minHeight: 80 }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A minimalist coffee shop interior, warm lighting, film photography style..."
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) generate(); }}
        />
        <p className="text-[11px] text-muted-foreground mt-1">Ctrl+Enter ile üret</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[13px] font-medium text-secondary mb-1.5 block">Boyut</label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={`${s.w}x${s.h}`} value={`${s.w}x${s.h}`}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[13px] font-medium text-secondary mb-1.5 block">Model</label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full gap-2">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor...</> : <><Wand2 className="w-4 h-4" /> Üret</>}
      </Button>

      {imageUrl && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <img
              src={imageUrl}
              alt="Üretilen görsel"
              className="w-full rounded-[8px] bg-muted"
              onError={() => toast.error("Görsel yüklenemedi. Prompt'u değiştirip tekrar dene.")}
            />

            {driveUrl && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                <Check className="w-3 h-3" /> Drive'a kaydedildi —
                <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="underline">Görüntüle</a>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1"
                onClick={() => window.open(imageUrl, "_blank")}>
                <ExternalLink className="w-3 h-3" /> Tam boyut
              </Button>
              <Button variant="outline" size="sm" className="gap-1"
                onClick={() => { const a = document.createElement("a"); a.href = imageUrl; a.download = "gorsel.jpg"; a.target = "_blank"; a.click(); }}>
                <Download className="w-3 h-3" /> İndir
              </Button>
              {selectedCompanyId && selectedCompany?.drive_folder_id && !driveUrl && (
                <Button variant="outline" size="sm" className="gap-1 text-blue-700 border-blue-300"
                  onClick={saveToDrive} disabled={savingToDrive}>
                  {savingToDrive ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDriveUpload className="w-3 h-3" />}
                  Drive'a Kaydet
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}