import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Globe, Palette } from "lucide-react";
import OldSiteImport from "./OldSiteImport";
import EditableColorPalette from "./EditableColorPalette";

export default function WizardStep1({ data, setData, companies }) {
  const company = companies.find(c => c.id === data.company_id);

  const handleCompanyChange = (companyId) => {
    const c = companies.find(x => x.id === companyId);
    setData({
      ...data,
      company_id: companyId,
      company_name: c?.name || "",
      sector: c?.sector || "",
      // Firmadan paleti çek; kullanıcı sonra düzenleyebilir
      color_palette: (data.color_palette?.length ? data.color_palette : (c?.color_palette || [])),
    });
  };

  const palette = data.color_palette?.length ? data.color_palette : (company?.color_palette || []);

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-1.5 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Firma Seçimi <span className="text-rose-500">*</span>
        </Label>
        <Select value={data.company_id} onValueChange={handleCompanyChange}>
          <SelectTrigger><SelectValue placeholder="Firma seçin..." /></SelectTrigger>
          <SelectContent>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {company && (
        <Card className="bg-orange-50/50 border-orange-200">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
              Firma Bilgileri (otomatik)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Sektör:</span>{" "}
                <span className="font-medium">{company.sector || "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Site:</span>{" "}
                <span className="font-medium truncate">{company.website || "—"}</span>
              </div>
              <div className="col-span-full">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Palette className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">Renk Paleti:</span>
                  <span className="text-[10px] text-muted-foreground">(düzenlemek için renge tıkla)</span>
                </div>
                <EditableColorPalette
                  colors={palette}
                  onChange={(next) => setData({ ...data, color_palette: next })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <Label className="mb-1.5">Proje Adı <span className="text-rose-500">*</span></Label>
        <Input
          value={data.project_name || ""}
          onChange={(e) => setData({ ...data, project_name: e.target.value })}
          placeholder="Örn: Kurumsal Web Sitesi 2026"
        />
      </div>

      <div>
        <Label className="mb-1.5">Teslimat Tarihi (Deadline)</Label>
        <Input
          type="date"
          value={data.deadline || ""}
          onChange={(e) => setData({ ...data, deadline: e.target.value })}
        />
      </div>

      <OldSiteImport data={data} setData={setData} />
    </div>
  );
}