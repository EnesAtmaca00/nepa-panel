import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { FEATURE_OPTIONS, AI_TOOLS, ANIMATION_OPTIONS, ANIMATION_INTENSITY_OPTIONS, DESIGN_STYLES, COLOR_MOODS } from "./webProjectConstants";
import HelpTooltip from "@/components/help/HelpTooltip";

export default function WizardStep2({ data, setData }) {
  const toggleFeature = (id) => {
    const current = data.features || [];
    const next = current.includes(id) ? current.filter(f => f !== id) : [...current, id];
    setData({ ...data, features: next });
  };

  const toggleAnimation = (id) => {
    const current = data.animation_types || [];
    const next = current.includes(id) ? current.filter(a => a !== id) : [...current, id];
    setData({ ...data, animation_types: next, wants_animation: next.length > 0 });
  };

  const updateRefLink = (idx, value) => {
    const next = [...(data.reference_links || [])];
    next[idx] = value;
    setData({ ...data, reference_links: next });
  };

  const addRefLink = () => {
    setData({ ...data, reference_links: [...(data.reference_links || []), ""] });
  };

  const removeRefLink = (idx) => {
    const next = [...(data.reference_links || [])];
    next.splice(idx, 1);
    setData({ ...data, reference_links: next });
  };

  return (
    <div className="space-y-6">
      {/* Özellikler */}
      <div>
        <Label className="mb-2 block">İstenen Özellikler</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FEATURE_OPTIONS.map(opt => {
            const active = (data.features || []).includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleFeature(opt.id)}
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all text-sm ${
                  active
                    ? "bg-orange-50 border-orange-500 text-orange-900 shadow-sm"
                    : "border-border hover:border-orange-300 hover:bg-orange-50/30"
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="font-medium text-xs">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasarım Stili */}
      <div>
        <Label className="mb-2 block">Tasarım Stili</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {DESIGN_STYLES.map(style => {
            const active = data.design_style === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setData({ ...data, design_style: style.id })}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${
                  active
                    ? "bg-violet-50 border-violet-500 text-violet-900 shadow-sm"
                    : "border-border hover:border-violet-300 hover:bg-violet-50/30"
                }`}
              >
                <span className="text-lg">{style.icon}</span>
                <span className="font-medium text-xs">{style.label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight text-center">{style.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Renk Modu */}
      <div>
        <Label className="mb-2 block">Renk Modu</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COLOR_MOODS.map(mood => {
            const active = data.color_mood === mood.id;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => setData({ ...data, color_mood: mood.id })}
                className={`text-left p-2.5 rounded-lg border-2 transition-all ${
                  active
                    ? "bg-emerald-50 border-emerald-500 shadow-sm"
                    : "border-border hover:border-emerald-300 hover:bg-emerald-50/30"
                }`}
              >
                <div className={`font-semibold text-xs ${active ? "text-emerald-900" : ""}`}>{mood.label}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{mood.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animasyon & Efektler */}
      <div>
        <Label className="mb-2 block">Animasyon & Efektler (çoklu seçim)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ANIMATION_OPTIONS.map(anim => {
            const active = (data.animation_types || []).includes(anim.id);
            return (
              <button
                key={anim.id}
                type="button"
                onClick={() => toggleAnimation(anim.id)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${
                  active
                    ? "bg-cyan-50 border-cyan-500 text-cyan-900 shadow-sm"
                    : "border-border hover:border-cyan-300 hover:bg-cyan-50/30"
                }`}
              >
                <span className="text-lg">{anim.icon}</span>
                <span className="font-medium text-xs">{anim.label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight text-center">{anim.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Animasyon yoğunluk seviyesi — sadece animasyon seçildiyse */}
        {(data.animation_types || []).length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-cyan-50/50 border border-cyan-200">
            <Label className="mb-2 block text-cyan-900">Animasyon Yoğunluğu</Label>
            <p className="text-[10px] text-muted-foreground mb-2">Seçilen animasyonların ne kadar belirgin olacağını belirleyin.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ANIMATION_INTENSITY_OPTIONS.map(opt => {
                const active = (data.animation_intensity || "balanced") === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setData({ ...data, animation_intensity: opt.id })}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${
                      active
                        ? "bg-cyan-100 border-cyan-500 text-cyan-900 shadow-sm"
                        : "border-border bg-white hover:border-cyan-300"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="font-medium text-xs">{opt.label}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight text-center">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sayfa sayısı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5">Sayfa Sayısı</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={data.page_count || 5}
            onChange={(e) => setData({ ...data, page_count: parseInt(e.target.value) || 5 })}
          />
        </div>
      </div>

      {/* Özel notlar */}
      <div>
        <Label className="mb-1.5">Özel Notlar / Gereksinimler</Label>
        <Textarea
          rows={3}
          value={data.extra_specs || ""}
          onChange={(e) => setData({ ...data, extra_specs: e.target.value })}
          placeholder="Tasarımsal istekleriniz, özel yazılım gereksinimleri..."
        />
      </div>

      {/* Referans linkler */}
      <div>
        <Label className="mb-2 block">Referans Linkler (ilham siteler)</Label>
        <p className="text-[10px] text-muted-foreground mb-2">AI, bu siteleri analiz edip tasarım dillerini prompt'a yansıtacak.</p>
        <div className="space-y-2">
          {(data.reference_links || []).map((link, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={link}
                onChange={(e) => updateRefLink(idx, e.target.value)}
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeRefLink(idx)}
                className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-rose-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addRefLink}
            className="w-full border-dashed text-emerald-600 hover:bg-emerald-50 border-emerald-300"
          >
            <Plus className="w-4 h-4 mr-1" /> Yeni Link Ekle
          </Button>
        </div>
      </div>

      {/* AI Tool Seçimi */}
      <div>
        <Label className="mb-2 flex items-center">AI Araç Seçimi<HelpTooltip topic="web_architect" /></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {AI_TOOLS.map(tool => {
            const active = data.ai_tool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setData({ ...data, ai_tool: tool.id })}
                className={`text-left p-3 rounded-lg border-2 transition-all ${
                  active
                    ? "bg-orange-50 border-orange-500 shadow-sm"
                    : "border-border hover:border-orange-300"
                }`}
              >
                <div className={`font-semibold text-sm ${active ? "text-orange-900" : ""}`}>{tool.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{tool.description}</div>
              </button>
            );
          })}
        </div>
        {data.ai_tool === "other" && (
          <div className="mt-3">
            <Input
              placeholder="Hangi AI aracını kullanacaksınız?"
              value={data.ai_tool_other || ""}
              onChange={(e) => setData({ ...data, ai_tool_other: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}