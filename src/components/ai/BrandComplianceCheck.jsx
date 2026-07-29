import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Skor rengine göre stil
function scoreStyle(score) {
  if (score >= 80) return { color: "emerald", icon: CheckCircle2, label: "Yüksek Uyum" };
  if (score >= 55) return { color: "amber", icon: AlertTriangle, label: "Orta Uyum" };
  return { color: "rose", icon: AlertTriangle, label: "Düşük Uyum" };
}

const COLOR_MAP = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  rose: "bg-rose-50 border-rose-200 text-rose-700",
};

/**
 * Üretilen görsel prompt'unu marka kimliği (StyleMemory + Company) ile
 * METİN seviyesinde karşılaştırır. Görsel üretmez — sadece tutarlılık denetler.
 * Sistemin global AI ayarını (aiInvoke) kullanır.
 */
export default function BrandComplianceCheck({ prompt, company }) {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);

  const runCheck = async () => {
    if (!prompt || !company?.id) return;
    setLoading(true);
    setAudit(null);

    try {
      // Marka görsel kimliği — StyleMemory varsa çek
      let styleMemory = null;
      try {
        const rows = await base44.entities.StyleMemory.filter({ company_id: company.id }, "-updated_date", 1);
        styleMemory = rows?.[0] || null;
      } catch (_) {}

      const brandRef = [];
      if (company.color_palette?.length) brandRef.push(`Marka Renkleri: ${company.color_palette.join(", ")}`);
      if (company.brand_keywords?.length) brandRef.push(`Marka Anahtar Kelimeleri: ${company.brand_keywords.join(", ")}`);
      if (styleMemory?.dominant_colors?.length) brandRef.push(`Baskın Renkler: ${styleMemory.dominant_colors.join(", ")}`);
      if (styleMemory?.mood_tags?.length) brandRef.push(`Marka Mood: ${styleMemory.mood_tags.join(", ")}`);
      if (styleMemory?.composition_patterns?.length) brandRef.push(`Tercih Edilen Kompozisyonlar: ${styleMemory.composition_patterns.join(", ")}`);
      if (styleMemory?.typography_style) brandRef.push(`Tipografi Stili: ${styleMemory.typography_style}`);
      if (styleMemory?.common_elements?.length) brandRef.push(`Tekrarlayan Görsel Öğeler: ${styleMemory.common_elements.join(", ")}`);

      if (brandRef.length === 0) {
        toast.info("Bu marka için kayıtlı görsel kimlik verisi (StyleMemory/renk paleti) yok. Önce stil analizi yapın.");
        setLoading(false);
        return;
      }

      const systemPrompt = `Sen bir marka tasarım denetçisisin. Görevin: verilen bir GÖRSEL PROMPT metnini, markanın görsel kimlik rehberiyle karşılaştırıp tutarlılığını değerlendirmek. Görsel ÜRETMEZSİN — sadece metin seviyesinde mantıksal denetim yaparsın. Renk, mood, kompozisyon ve tipografi uyumuna odaklan. Tüm çıktın Türkçe olmalı.`;

      const userPrompt = `Aşağıdaki görsel prompt'unu, markanın görsel kimlik rehberiyle karşılaştır.

━━━ MARKA GÖRSEL KİMLİĞİ ━━━
${brandRef.join("\n")}

━━━ DENETLENECEK GÖRSEL PROMPT ━━━
${prompt}

Sadece şu JSON'u döndür:
{
  "score": <0-100 arası tutarlılık skoru>,
  "summary": "<1 cümlelik genel değerlendirme>",
  "issues": ["<marka kimliğinden sapan noktalar, yoksa boş dizi>"],
  "suggestions": ["<prompt'u marka kimliğine yaklaştırmak için somut öneriler>"]
}`;

      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "content_idea",
        system_prompt: systemPrompt,
        prompt: userPrompt,
        json_mode: true,
        skip_cache: true,
      });

      const aiData = res.data || res;
      if (aiData?.error) throw new Error(aiData.error);

      let parsed = null;
      const raw = aiData.result || "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      try { parsed = JSON.parse(cleaned); } catch (_) {
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        if (s !== -1 && e > s) try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (_2) {}
      }

      if (!parsed) throw new Error("Denetim yanıtı okunamadı");
      setAudit(parsed);
    } catch (e) {
      toast.error("Denetim hatası: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!audit && !loading) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-[11px] h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        onClick={runCheck}
      >
        <ShieldCheck className="w-3 h-3 mr-1" /> Marka Uyumunu Denetle
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Marka uyumu denetleniyor...
      </div>
    );
  }

  const score = Math.max(0, Math.min(100, Number(audit.score) || 0));
  const st = scoreStyle(score);
  const Icon = st.icon;

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${COLOR_MAP[st.color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-semibold">Marka Tasarım Uyumu</span>
        </div>
        <Badge variant="outline" className="text-[11px] font-bold bg-white/60">
          {score}/100 · {st.label}
        </Badge>
      </div>

      {audit.summary && <p className="text-[11px] leading-relaxed">{audit.summary}</p>}

      {audit.issues?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">⚠ Sapmalar</p>
          <ul className="text-[11px] list-disc list-inside space-y-0.5">
            {audit.issues.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
      )}

      {audit.suggestions?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">💡 Öneriler</p>
          <ul className="text-[11px] list-disc list-inside space-y-0.5">
            {audit.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <button onClick={runCheck} className="text-[10px] underline opacity-70 hover:opacity-100">🔄 Yeniden Denetle</button>
    </div>
  );
}