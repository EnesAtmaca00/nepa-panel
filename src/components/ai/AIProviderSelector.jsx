import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu } from "lucide-react";

export default function AIProviderSelector({ value, onChange, compact = false, label = "Promptu Üreten AI" }) {
  // Anahtarlar app_settings'te DEĞİL, Supabase Vault'ta. Buradan sadece
  // hangi sağlayıcının anahtarı var bilgisini alıyoruz — değerini değil.
  const { data: keyStatus } = useQuery({
    queryKey: ["provider-key-status"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("provider_key_status");
      if (error) throw new Error(error.message);
      const map = {};
      for (const row of data ?? []) map[row.provider] = row.has_key;
      return map;
    },
  });

  const providers = useMemo(() => {
    const list = [{ value: "auto", label: "🤖 Otomatik (Önerilen)" }];
    if (!keyStatus) return list;
    if (keyStatus.gemini) list.push({ value: "gemini", label: "Gemini (Google)" });
    if (keyStatus.openai) list.push({ value: "openai", label: "OpenAI (GPT)" });
    if (keyStatus.anthropic) list.push({ value: "anthropic", label: "Anthropic (Claude)" });
    if (keyStatus.openrouter) list.push({ value: "openrouter", label: "OpenRouter" });
    return list;
  }, [keyStatus]);

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