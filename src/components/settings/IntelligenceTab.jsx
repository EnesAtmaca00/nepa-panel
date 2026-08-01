// KATMAN 8: Ayarlar — Zeka & Proaktif Sistem sekmesi
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Brain, Zap, AlertTriangle } from "lucide-react";
import ApiKeyField from "./ApiKeyField";
import useProviderKeys from "./useProviderKeys";

export default function IntelligenceTab({ data, set }) {
  // Anahtarlar artık app_settings'te değil, Supabase Vault'ta.
  // Burada sadece "kayıtlı mı" bilgisini okuyoruz.
  const { status, refresh } = useProviderKeys();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" /> Zeka & Düşünme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">Chain-of-Thought (Derin Düşünme)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tüm AI çağrılarında model önce <code>&lt;think&gt;</code> bloğunda strateji kurar, sonra cevap üretir.
                Sonuçlar 2-3x daha iyi olur. Ekstra ücret yok.
              </p>
            </div>
            <Switch
              checked={!!data.chain_of_thought_enabled}
              onCheckedChange={(v) => set("chain_of_thought_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" /> Ücretsiz API Entegrasyonları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApiKeyField
            label="Unsplash Access Key"
            provider="unsplash"
            saved={status.unsplash?.has_key}
            savedAt={status.unsplash?.updated_at}
            onChanged={refresh}
            placeholder="Sunum görselleri için"
            hint="unsplash.com/developers — boş bırakırsan source URL kullanılır."
          />
          <ApiKeyField
            label="Brave Search API Key"
            provider="brave"
            saved={status.brave?.has_key}
            savedAt={status.brave?.updated_at}
            onChanged={refresh}
            placeholder="Araştırma için"
            hint="brave.com/search/api"
          />
          <ApiKeyField
            label="Jina API Key (opsiyonel)"
            provider="jina"
            saved={status.jina?.has_key}
            savedAt={status.jina?.updated_at}
            onChanged={refresh}
            placeholder="Web içerik okuma için"
            hint="jina.ai — keysiz de çalışır."
          />
          <div className="flex items-center justify-between pt-2">
            <div>
              <Label className="cursor-pointer">Pollinations.ai Görsel Üretimi</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mix sayfasında ücretsiz AI görsel üretimi (api key gerekmez).
              </p>
            </div>
            <Switch
              checked={data.pollinations_enabled !== false}
              onCheckedChange={(v) => set("pollinations_enabled", v)}
            />
          </div>
          {data.exchange_rate_eur_try && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              💱 Güncel kur: <strong>1 EUR = {data.exchange_rate_eur_try} TRY</strong>
              {data.exchange_rate_updated_at && (
                <span className="ml-2 opacity-60">
                  ({new Date(data.exchange_rate_updated_at).toLocaleDateString("tr-TR")} güncel)
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Proaktif Sistem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">Anomali Bildirimleri</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dashboard açılınca içerik boşluğu, sözleşme bitişi, overdue fatura kontrolü yapılır.
              </p>
            </div>
            <Switch
              checked={data.proactive_alerts_enabled !== false}
              onCheckedChange={(v) => set("proactive_alerts_enabled", v)}
            />
          </div>
          <div>
            <Label className="mb-1.5">İçerik Boşluğu Eşiği (gün)</Label>
            <Input
              type="number"
              value={data.content_gap_threshold_days ?? 14}
              onChange={(e) => set("content_gap_threshold_days", parseInt(e.target.value) || 14)}
              className="max-w-[150px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bu kadar gündür içerik üretilmeyen firmalar için uyarı oluşur.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">Enricher Otomatik Çalışsın</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Yeni firma eklenince AI ile marka bilgileri otomatik analiz edilsin.
              </p>
            </div>
            <Switch
              checked={!!data.enricher_auto_enabled}
              onCheckedChange={(v) => set("enricher_auto_enabled", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}