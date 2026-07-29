import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

export default function StepBrand({ data, update }) {
  const [keyword, setKeyword] = useState("");
  const [color, setColor] = useState("#0F172A");

  const addKeyword = () => {
    if (!keyword.trim()) return;
    // Virgülle ayrılmış birden fazla kelime destekle
    const newKeywords = keyword
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0);
    const existing = data.brand_keywords || [];
    const merged = [...new Set([...existing, ...newKeywords])];
    update({ brand_keywords: merged });
    setKeyword("");
  };

  const removeKeyword = (idx) => {
    const arr = [...(data.brand_keywords || [])];
    arr.splice(idx, 1);
    update({ brand_keywords: arr });
  };

  const addColor = () => {
    // Virgülle ayrılmış birden fazla renk destekle
    const colors = color.split(',').map(c => c.trim()).filter(c => c.startsWith('#'));
    if (colors.length > 0) {
      update({ color_palette: [...(data.color_palette || []), ...colors] });
      setColor("#0F172A");
    } else if (color.startsWith('#')) {
      update({ color_palette: [...(data.color_palette || []), color] });
      setColor("#0F172A");
    }
  };

  const removeColor = (idx) => {
    const arr = [...(data.color_palette || [])];
    arr.splice(idx, 1);
    update({ color_palette: arr });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-1.5">Marka Tanımı</Label>
        <Textarea
          value={data.brand_description}
          onChange={(e) => update({ brand_description: e.target.value })}
          placeholder="Marka kısaca ne yapıyor, kim için, neden var?"
          rows={3}
        />
      </div>

      <div>
        <Label className="mb-1.5">Hedef Kitle</Label>
        <Textarea
          value={data.target_audience}
          onChange={(e) => update({ target_audience: e.target.value })}
          placeholder="Yaş aralığı, ilgi alanları, demografi..."
          rows={2}
        />
      </div>

      <div>
        <Label className="mb-1.5">Marka Anahtar Kelimeleri</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
            placeholder="Örn: özgün, lüks, sürdürülebilir"
          />
          <Button type="button" onClick={addKeyword} variant="outline"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(data.brand_keywords || []).map((k, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1">
              {k}
              <button onClick={() => removeKeyword(idx)}><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Renk Paleti</Label>
        <div className="flex gap-2 mb-2 items-center">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 rounded-lg border cursor-pointer"
          />
          <Input 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor(); } }}
            placeholder="#0F172A veya #fff, #000, #f00" 
            className="font-mono" 
          />
          <Button type="button" onClick={addColor} variant="outline"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(data.color_palette || []).map((c, idx) => (
            <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded-lg border">
              <div className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
              <span className="text-xs font-mono">{c}</span>
              <button onClick={() => removeColor(idx)}><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}