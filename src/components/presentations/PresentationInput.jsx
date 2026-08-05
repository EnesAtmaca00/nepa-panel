// Sunum oluşturucu — Adım 1: ham metin girişi + opsiyonel firma seçimi + logo
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Zap, ArrowLeft, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function PresentationInput({ onCancel, onSubmit }) {
  const [inputText, setInputText] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState(null);
  const [logoSource, setLogoSource] = useState(null); // 'company' | 'uploaded' | 'drive'

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-presentation"],
    queryFn: () => base44.entities.Company.filter({ deleted: false, status: "active" }, "-updated_date", 100),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const selectedCompany = companies.find((c) => c.id === companyId);

  // Firma değişince yüklenen logo'yu sıfırla (firma logosu varsayılan)
  useEffect(() => {
    setUploadedLogoUrl(null);
    setLogoSource(selectedCompany?.logo_url ? "company" : null);
  }, [companyId, selectedCompany?.logo_url]);

  const activeLogoUrl = uploadedLogoUrl || selectedCompany?.logo_url || null;

  const handleLogoUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    // Önizleme için base64
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedLogoUrl(ev.target.result);
      setLogoSource("uploaded");
      toast.success("Logo yüklendi");
    };
    reader.readAsDataURL(file);
  };

  const logoyuDriveDanCek = async () => {
    if (!selectedCompany?.id) return;
    toast.info("Drive klasörü taranıyor...");
    try {
      const dosyalar = await base44.entities.FileItem.filter(
        { company_id: selectedCompany.id },
        "-created_date",
        50
      );
      const logoAdaylari = (dosyalar || []).filter((f) => {
        const name = (f.name || "").toLowerCase();
        const isImage = name.match(/\.(png|jpe?g|svg|webp)$/i);
        return isImage && (name.includes("logo") || isImage);
      });
      // Önce "logo" kelimesi geçenleri tercih et
      const logo = logoAdaylari.find((f) => (f.name || "").toLowerCase().includes("logo")) || logoAdaylari[0];
      if (logo?.url) {
        setUploadedLogoUrl(logo.url);
        setLogoSource("drive");
        toast.success(`Logo bulundu: ${logo.name}`);
      } else {
        toast.warning("Drive klasöründe logo bulunamadı. Manuel yükleyin.");
      }
    } catch {
      toast.error("Drive taraması başarısız");
    }
  };

  const handle = (mode) => {
    if (!inputText.trim()) return;
    onSubmit({
      inputText: inputText.trim(),
      company: selectedCompany || null,
      meetingDate: meetingDate || "",
      mode,
      logoUrl: activeLogoUrl,
      logoSource,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={onCancel} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Listeye dön
      </button>

      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Müşteri Sunumu Oluştur</h1>
        <p className="text-muted-foreground text-sm">
          Müşterin hakkında bildiklerini yaz. Tek cümle de olur, roman da.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Firma + tarih */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <Building2 className="w-3 h-3" /> Sistemdeki firmadan yükle (opsiyonel)
              </label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma seç..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— Boş —</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Toplantı tarihi (opsiyonel)</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full h-9 border rounded-md px-3 text-sm"
              />
            </div>
          </div>

          {/* LOGO BÖLÜMÜ */}
          <div className="border border-dashed border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">🖼️ Firma Logosu (Opsiyonel)</p>

            {activeLogoUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={activeLogoUrl}
                  alt="Logo"
                  className="h-12 w-auto object-contain rounded-lg border bg-white p-1"
                />
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-medium">
                    ✓ {logoSource === "uploaded" ? "Yüklenen logo" : logoSource === "drive" ? "Drive'dan çekildi" : "Firma logosu"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sunumda kullanılacak</p>
                  <div className="flex gap-3 mt-1">
                    <label className="text-xs text-orange-500 hover:underline cursor-pointer">
                      Farklı logo yükle
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    {uploadedLogoUrl && (
                      <button
                        onClick={() => { setUploadedLogoUrl(null); setLogoSource(selectedCompany?.logo_url ? "company" : null); }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ✕ Kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center gap-2 cursor-pointer py-4 hover:bg-slate-50 rounded-lg transition-all">
                  <span className="text-3xl">📁</span>
                  <span className="text-sm text-muted-foreground">Logo yükle (PNG, JPG, SVG)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {selectedCompany?.id && (
                  <button
                    onClick={logoyuDriveDanCek}
                    className="w-full mt-2 text-xs text-blue-500 hover:underline flex items-center justify-center gap-1"
                  >
                    📂 Drive klasöründen logoyu otomatik bul
                  </button>
                )}
              </div>
            )}
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
            placeholder="Örnek: İstanbul Kebap isimli bir firmam var, Belçika'nın Turnhout bölgesinde. Menü tasarımı, TV videoları, araba kaplama, web sitesi, sosyal medya yönetimi ve reklam çekimleri yapacağız."
            className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-y min-h-[180px]"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => handle("ask")}
              disabled={!inputText.trim()}
              variant="outline"
              className="flex-1 h-11"
            >
              <Bot className="w-4 h-4 mr-1" /> Soru Sor & Oluştur
            </Button>
            <Button
              onClick={() => handle("direct")}
              disabled={!inputText.trim()}
              className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Zap className="w-4 h-4 mr-1" /> Direkt Oluştur
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            <strong>Soru Sor:</strong> AI eksik bilgileri sorar · <strong>Direkt:</strong> hemen üretir
          </p>
        </CardContent>
      </Card>
    </div>
  );
}