import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu } from "lucide-react";

export default function AIProviderSelector({ value, onChange, compact = false, label = "Promptu Üreten AI" }) {
  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const list = await base44.entities.AppSettings.list();
      return list[0] || {};
    },
  });

  const providers = useMemo(() => {
    if (!settings) return [];
    const list = [{ value: "auto", label: "🤖 Otomatik (Önerilen)" }];
    if (settings.gemini_api_key) list.push({ value: "gemini", label: "Gemini (Google)" });
    if (settings.openai_api_key) list.push({ value: "openai", label: "OpenAI (GPT)" });
    if (settings.anthropic_api_key) list.push({ value: "anthropic", label: "Anthropic (Claude)" });
    if (settings.openrouter_api_key) list.push({ value: "openrouter", label: "OpenRouter" });
    return list;
  }, [settings]);

  if (compact) {
    return (
      <Select value={value || "auto"} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs w-auto gap-1">
          <Cpu className="w-3 h-3" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {providers.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div>
      <Label className="mb-1.5">{label}</Label>
      <Select value={value || "auto"} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {providers.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {providers.length <= 1 && (
        <p className="text-[10px] text-amber-600 mt-1">
          Henüz API key yok. Ayarlar sayfasından ekle.
        </p>
      )}
    </div>
  );
}