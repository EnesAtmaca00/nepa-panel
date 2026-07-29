import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { 
  Download, 
  Save, 
  RefreshCw, 
  Type, 
  Image as ImageIcon, 
  Layout, 
  Palette 
} from "lucide-react";
import { toast } from "sonner";

// Mock jsPDF and generatePDF for preview
const generatePDFPreview = (template, data) => {
  console.log("Generating PDF with template:", template);
  return "pdf_preview_url_mock";
};

export default function PDFEditor({ type = "invoice", data = {}, onSave }) {
  const [template, setTemplate] = useState({
    titleText: type === "invoice" ? "FATURA" : "SÖZLEŞME",
    titleSize: 24,
    titleX: 20,
    titleY: 30,
    primaryColor: "#0f172a",
    logo: null,
    logoX: 150,
    logoY: 10,
    logoW: 40,
    logoH: 40,
    tableStartY: 70,
    footerText: "Teşekkür ederiz.",
    footerX: 20,
    footerY: 280,
    ...data.template_config
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  const updateTemplate = (updates) => {
    setTemplate(prev => ({ ...prev, ...updates }));
  };

  const handleRefreshPreview = () => {
    const url = generatePDFPreview(template, data);
    setPreviewUrl(url);
    toast.success("Önizleme güncellendi");
  };

  return (
    <div className="flex h-[80vh] gap-6 overflow-hidden">
      {/* Sol Panel: Önizleme */}
      <div className="flex-1 bg-muted rounded-lg flex flex-col overflow-hidden border">
        <div className="p-2 border-b bg-background flex justify-between items-center">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PDF Önizleme</span>
          <Button variant="ghost" size="sm" onClick={handleRefreshPreview}>
            <RefreshCw className="h-3 w-3 mr-1" /> Yenile
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {/* Gerçek uygulamada burada bir iframe veya canvas olur */}
          <div className="w-[420px] h-[594px] bg-white shadow-2xl relative p-8 text-slate-800">
            {/* Logo */}
            <div 
              className="absolute border border-dashed border-primary/20 flex items-center justify-center bg-slate-50"
              style={{ 
                left: `${template.logoX}px`, 
                top: `${template.logoY}px`, 
                width: `${template.logoW}px`, 
                height: `${template.logoH}px` 
              }}
            >
              {template.logo ? <img src={template.logo} alt="Logo" /> : <ImageIcon className="h-4 w-4 text-slate-300" />}
            </div>

            {/* Başlık */}
            <div 
              className="absolute font-bold"
              style={{ 
                left: `${template.titleX}px`, 
                top: `${template.titleY}px`, 
                fontSize: `${template.titleSize}px`,
                color: template.primaryColor
              }}
            >
              {template.titleText}
            </div>

            {/* Tablo Alanı */}
            <div 
              className="absolute left-8 right-8 border-t-2 border-slate-200 pt-4"
              style={{ top: `${template.tableStartY}px` }}
            >
              <div className="grid grid-cols-4 text-[10px] font-bold border-b pb-2 mb-2">
                <span>Hizmet</span>
                <span>Miktar</span>
                <span>Birim Fiyat</span>
                <span>Toplam</span>
              </div>
              {[1, 2].map(i => (
                <div key={i} className="grid grid-cols-4 text-[10px] py-1 border-b border-slate-50">
                  <span className="text-slate-400 italic">Örnek Hizmet {i}</span>
                  <span>1</span>
                  <span>1.000 TL</span>
                  <span>1.000 TL</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div 
              className="absolute text-[10px] text-slate-400"
              style={{ left: `${template.footerX}px`, top: `${template.footerY}px` }}
            >
              {template.footerText}
            </div>
          </div>
        </div>
      </div>

      {/* Sağ Panel: Düzenleme Formu */}
      <div className="w-80 space-y-6 overflow-y-auto pr-2">
        <section className="space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Type className="h-4 w-4" /> Başlık Ayarları
          </h3>
          <div className="space-y-2">
            <Label className="text-xs">Başlık Metni</Label>
            <Input 
              value={template.titleText} 
              onChange={(e) => updateTemplate({ titleText: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Boyut</Label>
              <Input 
                type="number" 
                value={template.titleSize} 
                onChange={(e) => updateTemplate({ titleSize: parseInt(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Renk</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={template.primaryColor} 
                  onChange={(e) => updateTemplate({ primaryColor: e.target.value })}
                  className="h-8 w-8 p-0 border-none"
                />
                <Input 
                  value={template.primaryColor} 
                  onChange={(e) => updateTemplate({ primaryColor: e.target.value })}
                  className="h-8 text-[10px] font-mono"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Logo Pozisyonu
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">X (Yatay)</Label>
              <Input 
                type="number" 
                value={template.logoX} 
                onChange={(e) => updateTemplate({ logoX: parseInt(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Y (Dikey)</Label>
              <Input 
                type="number" 
                value={template.logoY} 
                onChange={(e) => updateTemplate({ logoY: parseInt(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Layout className="h-4 w-4" /> İçerik Düzeni
          </h3>
          <div className="space-y-2">
            <Label className="text-xs">Tablo Başlangıç (Y)</Label>
            <Slider 
              value={[template.tableStartY]} 
              max={200} 
              step={1} 
              onValueChange={([val]) => updateTemplate({ tableStartY: val })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Alt Bilgi (Footer)</Label>
            <Textarea 
              value={template.footerText} 
              onChange={(e) => updateTemplate({ footerText: e.target.value })}
              className="text-xs min-h-[60px]"
            />
          </div>
        </section>

        <div className="pt-4 border-t space-y-2">
          <Button className="w-full" onClick={() => onSave(template)}>
            <Save className="h-4 w-4 mr-2" /> Şablonu Kaydet
          </Button>
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" /> PDF İndir
          </Button>
        </div>
      </div>
    </div>
  );
}

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
