import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, ShieldCheck, Image as ImageIcon, Hash } from "lucide-react";
import { PLATFORM_LABELS } from "@/lib/format";
import PillarBadge from "@/components/content/PillarBadge";
import VisualPromptGenerator from "./VisualPromptGenerator";
import { toast } from "sonner";

function copyToClipboard(text, label = "Kopyalandı") {
  navigator.clipboard.writeText(text || "");
  toast.success(label);
}

export default function MixResultCard({ idea, onSave, settings, company }) {
  const [captionLang, setCaptionLang] = useState(() => {
    const keys = Object.keys(idea.captions || {});
    return keys[0] || "TR";
  });

  const captionKeys = Object.keys(idea.captions || {});
  const allHashtags = [
    ...(idea.hashtags?.ana || []),
    ...(idea.hashtags?.trend || []),
    ...(idea.hashtags?.nis || []),
  ];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-3">
        {/* Başlık + Meta */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{idea.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{PLATFORM_LABELS[idea.platform] || idea.platform}</Badge>
              {idea.content_pillar && <PillarBadge pillar={idea.content_pillar} size="xs" />}
              {idea.suggested_time && <Badge variant="secondary" className="text-[10px]">🕒 {idea.suggested_time}</Badge>}
              {idea.audit_score != null && (
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                  idea.audit_score >= 65 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  <ShieldCheck className="w-2.5 h-2.5" /> {idea.audit_score}
                </span>
              )}
            </div>
          </div>
          <Button size="sm" onClick={onSave}>
            <Plus className="w-3 h-3 mr-1" /> Takvime Ekle
          </Button>
        </div>

        {/* Hook */}
        {idea.hook && (
          <div className="bg-orange-50 border border-orange-200 rounded p-2 text-xs">
            <span className="font-medium">Hook:</span> {idea.hook}
          </div>
        )}

        {/* Brief */}
        {idea.brief && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Brief</div>
            <p className="text-sm">{idea.brief}</p>
          </div>
        )}

        {/* Captions */}
        {captionKeys.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Caption</div>
              {captionKeys.length > 1 && (
                <div className="flex gap-1">
                  {captionKeys.map(lang => (
                    <button key={lang} onClick={() => setCaptionLang(lang)}
                      className={`px-1.5 py-0.5 text-[10px] rounded ${captionLang === lang ? "bg-gold text-slate-900" : "bg-muted"}`}
                    >{lang}</button>
                  ))}
                </div>
              )}
              <button onClick={() => copyToClipboard(idea.captions?.[captionLang], "Caption kopyalandı")} className="text-[10px] text-blue-600 hover:underline ml-auto">
                <Copy className="w-3 h-3 inline mr-0.5" />Kopyala
              </button>
            </div>
            <div className="border-l-2 border-gold pl-2">
              <p className="text-sm whitespace-pre-line">{idea.captions?.[captionLang]}</p>
            </div>
          </div>
        )}

        {/* Hashtags */}
        {allHashtags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Hashtags</span>
              <button onClick={() => copyToClipboard(allHashtags.join(" "), "Hashtagler kopyalandı")} className="text-[10px] text-blue-600 hover:underline ml-auto">Kopyala</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {allHashtags.map((h, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => copyToClipboard(h)}>
                  {h.startsWith("#") ? h : `#${h}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Görsel Prompt */}
        {idea.gorsel_prompt?.ingilizce && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground font-medium flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Görsel Prompt
            </summary>
            <div className="mt-2 space-y-2">
              {idea._imageUrl && (
                <div className="relative">
                  <img src={idea._imageUrl} alt="" className="w-full rounded-lg border max-h-64 object-cover" />
                  <a href={idea._imageUrl} target="_blank" rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-medium hover:bg-white">
                    Tam Boy
                  </a>
                </div>
              )}
              <div className="bg-muted/30 p-2 rounded space-y-1 text-[11px]">
                <p><strong>EN:</strong> {idea.gorsel_prompt.ingilizce}</p>
                {idea.gorsel_prompt.turkce && <p><strong>TR:</strong> {idea.gorsel_prompt.turkce}</p>}
                {idea.gorsel_prompt.negative && <p><strong>Negative:</strong> {idea.gorsel_prompt.negative}</p>}
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => copyToClipboard(idea.gorsel_prompt.ingilizce, "EN prompt kopyalandı")}>
                    <Copy className="w-2.5 h-2.5 mr-1" /> EN Prompt
                  </Button>
                  {idea.gorsel_prompt.tasarim_prompt && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => copyToClipboard(idea.gorsel_prompt.tasarim_prompt, "Tasarım promptu kopyalandı")}>
                      <Copy className="w-2.5 h-2.5 mr-1" /> Tasarım
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </details>
        )}

        {/* Teknik tavsiyeler */}
        {(idea.format || idea.tools) && (
          <div className="mt-2 pt-2 border-t flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {idea.format && <span>📐 {idea.format}</span>}
            {idea.tools && <span>🛠️ {idea.tools}</span>}
          </div>
        )}

        {/* Tasarım İçin Görsel Prompt Üretici */}
        <VisualPromptGenerator idea={idea} company={company} settings={settings} />
      </CardContent>
    </Card>
  );
}