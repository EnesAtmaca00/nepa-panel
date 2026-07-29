import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

export default function StepContract({ data, update }) {
  const [competitor, setCompetitor] = useState("");

  const addCompetitor = () => {
    if (!competitor.trim()) return;
    // Virgülle ayrılmış birden fazla rakip destekle
    const newCompetitors = competitor
      .split(",")
      .map(c => c.trim())
      .filter(c => c.length > 0);
    const existing = data.competitor_handles || [];
    const merged = [...new Set([...existing, ...newCompetitors])];
    update({ competitor_handles: merged });
    setCompetitor("");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5">Sözleşme Başlangıç</Label>
          <Input
            type="date"
            value={data.contract_start_date || ""}
            onChange={(e) => update({ contract_start_date: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5">Sözleşme Bitiş</Label>
          <Input
            type="date"
            value={data.contract_end_date || ""}
            onChange={(e) => update({ contract_end_date: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-1.5">Marka Kuruluş Tarihi (opsiyonel)</Label>
          <Input
            type="date"
            value={data.brand_founded_date || ""}
            onChange={(e) => update({ brand_founded_date: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">Yıldönümü hatırlatması için kullanılır.</p>
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Rakip Hesapları</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={competitor}
            onChange={(e) => setCompetitor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
            placeholder="@rakip1, @rakip2, @rakip3"
          />
          <Button type="button" onClick={addCompetitor} variant="outline"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(data.competitor_handles || []).map((c, idx) => (
            <Badge key={idx} variant="outline" className="gap-1">
              {c}
              <button onClick={() => {
                const arr = [...data.competitor_handles];
                arr.splice(idx, 1);
                update({ competitor_handles: arr });
              }}><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Notlar</Label>
        <Textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Bu müşteri ile ilgili önemli notlar..."
          rows={4}
        />
      </div>
    </div>
  );
}