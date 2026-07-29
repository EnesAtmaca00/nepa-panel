import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Check, Cpu, Sparkles, Zap, Crown, Flame, Filter } from "lucide-react";
import { toast } from "sonner";

const TIER_CONFIG = {
  free:     { label: "Ücretsiz",    icon: Zap,      color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cheap:    { label: "Ekonomik",    icon: Sparkles,  color: "bg-blue-100 text-blue-800 border-blue-200" },
  standard: { label: "Standart",   icon: Cpu,       color: "bg-amber-100 text-amber-800 border-amber-200" },
  premium:  { label: "Premium",    icon: Crown,     color: "bg-purple-100 text-purple-800 border-purple-200" },
  ultra:    { label: "Ultra",      icon: Flame,     color: "bg-red-100 text-red-800 border-red-200" },
};

const TIER_ORDER = ["free", "cheap", "standard", "premium", "ultra"];

function formatPrice(price) {
  if (price <= 0) return "Ücretsiz";
  if (price < 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

export default function AIModelTab({ data, set }) {
  const [models, setModels] = useState({ openrouter: [], gemini: [], openai: [], anthropic: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("fetchOpenRouterModels", {});
      setModels(res.data?.models || {});
    } catch (e) {
      toast.error("Model listesi yüklenemedi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const allModels = useMemo(() => {
    const all = [];
    for (const [provider, list] of Object.entries(models)) {
      for (const m of list) {
        all.push({ ...m, provider });
      }
    }
    return all;
  }, [models]);

  const filtered = useMemo(() => {
    let result = allModels;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
    }
    if (tierFilter !== "all") {
      result = result.filter(m => m.tier === tierFilter);
    }
    if (providerFilter !== "all") {
      result = result.filter(m => m.provider === providerFilter);
    }
    return result;
  }, [allModels, search, tierFilter, providerFilter]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const tier of TIER_ORDER) {
      const items = filtered.filter(m => m.tier === tier);
      if (items.length > 0) groups[tier] = items;
    }
    return groups;
  }, [filtered]);

  const connectedProviders = useMemo(() => {
    return Object.entries(models).filter(([, list]) => list.length > 0).map(([k]) => k);
  }, [models]);

  const selectedModel = data.default_ai_model || "";

  const selectModel = (modelId, provider) => {
    set("default_ai_model", modelId);
    // Also auto-set preferred provider
    if (provider && ["openrouter", "gemini", "openai", "anthropic"].includes(provider)) {
      set("preferred_ai_provider", provider);
    }
    toast.success("Varsayılan model seçildi — kaydetmeyi unutmayın");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Modeller yükleniyor...</span>
      </div>
    );
  }

  if (connectedProviders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Cpu className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Henüz API bağlantısı yapılmadı.</p>
          <p className="text-xs text-muted-foreground mt-1">AI & API sekmesinden en az bir provider'a API key girin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current selection */}
      {selectedModel && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm font-medium">Aktif Model</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedModel}</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => set("default_ai_model", "")}>
                Sıfırla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtrele & Ara
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Model ara... (GPT, Claude, Gemini...)"
                className="pl-9"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Fiyat Filtresi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Fiyatlar</SelectItem>
                <SelectItem value="free">🆓 Ücretsiz</SelectItem>
                <SelectItem value="cheap">💰 Ekonomik</SelectItem>
                <SelectItem value="standard">⭐ Standart</SelectItem>
                <SelectItem value="premium">💎 Premium</SelectItem>
                <SelectItem value="ultra">🚀 Ultra</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Provider'lar</SelectItem>
                {connectedProviders.map(p => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {filtered.length} model listeleniyor (toplam {allModels.length})
          </p>
        </CardContent>
      </Card>

      {/* Model List */}
      {Object.entries(grouped).map(([tier, items]) => {
        const cfg = TIER_CONFIG[tier];
        const Icon = cfg.icon;
        return (
          <Card key={tier}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {cfg.label}
                <Badge variant="outline" className="ml-auto text-xs font-normal">{items.length} model</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-96 overflow-y-auto">
                {items.map((m) => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => selectModel(m.id, m.provider)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3 ${isSelected ? "bg-accent/10" : ""}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-accent text-white" : "border border-muted-foreground/20"}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{m.id}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                        <ProviderBadge provider={m.provider} />
                        <div className="text-right min-w-[70px]">
                          <p className="text-xs font-medium">{formatPrice(m.input_price)}</p>
                          <p className="text-[10px] text-muted-foreground">/1M input</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Filtre kriterlerine uygun model bulunamadı.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProviderBadge({ provider }) {
  const colors = {
    openrouter: "bg-violet-100 text-violet-700",
    gemini: "bg-blue-100 text-blue-700",
    openai: "bg-green-100 text-green-700",
    anthropic: "bg-orange-100 text-orange-700",
  };
  const labels = {
    openrouter: "OpenRouter",
    gemini: "Gemini",
    openai: "OpenAI",
    anthropic: "Anthropic",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[provider] || "bg-muted text-muted-foreground"}`}>
      {labels[provider] || provider}
    </span>
  );
}