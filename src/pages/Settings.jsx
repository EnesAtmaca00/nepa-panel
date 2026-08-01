import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Key, Check, FolderOpen, Sparkles, DollarSign, Send, Plus, Trash2, Users, ShieldCheck, Loader2, Brain, Cpu } from "lucide-react";
import { toast } from "sonner";
import ApiKeyField from "@/components/settings/ApiKeyField";
import useProviderKeys from "@/components/settings/useProviderKeys";
import TeamTab from "@/components/settings/TeamTab";
import CostTab from "@/components/settings/CostTab";
import PageAccessTab from "@/components/settings/PageAccessTab";
import IntelligenceTab from "@/components/settings/IntelligenceTab";
import AIModelTab from "@/components/settings/AIModelTab";
import GoogleBaglanti from "@/components/settings/GoogleBaglanti";

export default function Settings() {
  const queryClient = useQueryClient();
  // API anahtarları artık app_settings'te değil, Supabase Vault'ta.
  // Buradan sadece "kayıtlı mı" bilgisini okuyoruz; değerleri asla gelmiyor.
  const { status: keyStatus, refresh: refreshKeys } = useProviderKeys();
  const [data, setData] = useState({
    agency_name: "AjansPro",
    default_currency: "TRY",
    preferred_ai_provider: "gemini",
    savings_mode: true,
    monthly_ai_budget: 20,
    recurring_reminder_time: "09:00",
    target_reminder_days: 7,
    target_reminder_threshold: 70,
    telegram_bot_token: "",
    telegram_chat_ids: [],
    telegram_enabled: false,
  });
  const [newChatId, setNewChatId] = useState("");
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [makingPublic, setMakingPublic] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
    initialData: [],
  });

  const settings = settingsList[0];
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings && !initialized) {
      setData(prev => ({ ...prev, ...settings }));
      setInitialized(true);
    }
  }, [settings?.id, initialized]);

  const save = useMutation({
    mutationFn: async (payload) => {
      if (settings?.id) return base44.entities.AppSettings.update(settings.id, payload);
      return base44.entities.AppSettings.create(payload);
    },
    onSuccess: () => {
      // Sadece cache'i sil ama setData'yı tetikleme
      queryClient.setQueryData(["app-settings"], (old) => old);
      toast.success("Ayarlar kaydedildi");
    },
  });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const addChatId = () => {
    if (!newChatId.trim()) return;
    set("telegram_chat_ids", [...(data.telegram_chat_ids || []), newChatId.trim()]);
    setNewChatId("");
  };

  const removeChatId = (id) => {
    set("telegram_chat_ids", (data.telegram_chat_ids || []).filter(c => c !== id));
  };

  const testTelegram = async () => {
    setTestingTelegram(true);
    try {
      await save.mutateAsync(data);
      const res = await base44.functions.invoke("sendTelegramNotification", {
        title: "Test Bildirimi",
        message: "AjansPro Telegram bağlantısı çalışıyor! ✅",
        severity: "success",
      });
      if (res.data?.sent > 0) toast.success(`${res.data.sent} kişiye test mesajı gönderildi`);
      else toast.error("Mesaj gönderilemedi — token ve chat_id'leri kontrol et");
    } catch (e) {
      toast.error("Hata: " + e.message);
    } finally {
      setTestingTelegram(false);
    }
  };

  const makeAllFilesPublic = async () => {
    if (!confirm("Tüm müşterilerin Drive dosyaları herkese açık hale gelecek. Devam edilsin mi?")) {
      return;
    }
    setMakingPublic(true);
    try {
      const companies = await base44.entities.Company.list();
      let totalSuccess = 0;
      let totalErrors = 0;

      for (const company of companies) {
        try {
          const result = await base44.functions.invoke("makeFilesPublic", { 
            company_id: company.id 
          });
          totalSuccess += result.data?.successCount || 0;
          totalErrors += result.data?.errorCount || 0;
        } catch (err) {
          console.error(`${company.name} hatası:`, err);
          totalErrors++;
        }
      }

      toast.success(`✅ ${totalSuccess} dosya public yapıldı. ${totalErrors > 0 ? `${totalErrors} hata.` : ''}`);
    } catch (e) {
      toast.error("Hata: " + e.message);
    } finally {
      setMakingPublic(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground text-sm mt-1">Uygulama tercihleri ve API entegrasyonları</p>
      </div>

      <Tabs defaultValue="genel">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="ai">AI & API</TabsTrigger>
          <TabsTrigger value="model" className="gap-1"><Cpu className="w-3.5 h-3.5" /> AI Model</TabsTrigger>
          <TabsTrigger value="zeka" className="gap-1"><Brain className="w-3.5 h-3.5" /> Zeka</TabsTrigger>
          <TabsTrigger value="bildirimler">Bildirimler</TabsTrigger>
          <TabsTrigger value="hatirlatmalar">Hatırlatmalar</TabsTrigger>
          <TabsTrigger value="ekip" className="gap-1"><Users className="w-3.5 h-3.5" /> Ekip</TabsTrigger>
          <TabsTrigger value="maliyet">AI Maliyeti</TabsTrigger>
          <TabsTrigger value="erisim" className="gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Sayfa Erişimi</TabsTrigger>
        </TabsList>

        {/* GENEL */}
        <TabsContent value="genel" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Ajans Profili</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="mb-1.5">Ajans Logosu</Label>
                <div className="flex items-center gap-3">
                  {data.agency_logo_url && (
                    <img src={data.agency_logo_url} alt="Logo" className="w-10 h-10 rounded object-contain border" />
                  )}
                  <Input
                    value={data.agency_logo_url || ""}
                    onChange={(e) => set("agency_logo_url", e.target.value)}
                    placeholder="URL veya dosya yükleyin"
                    className="flex-1"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="agency-logo-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        set("agency_logo_url", file_url);
                        toast.success("Logo yüklendi");
                      } catch (err) {
                        toast.error("Yükleme hatası: " + err.message);
                      }
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("agency-logo-upload").click()}>
                    Yükle
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">PNG veya SVG önerilir. Yükle butonuyla dosya yükleyebilirsiniz.</p>
              </div>
              <div>
                <Label className="mb-1.5">Ajans Adı</Label>
                <Input value={data.agency_name || ""} onChange={(e) => set("agency_name", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Varsayılan Para Birimi</Label>
                <Select value={data.default_currency} onValueChange={(v) => set("default_currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">₺ Türk Lirası</SelectItem>
                    <SelectItem value="EUR">€ Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Ajans E-postası</Label>
                <Input type="email" value={data.agency_email || ""} onChange={(e) => set("agency_email", e.target.value)} placeholder="info@ajans.com" />
              </div>
              <div>
                <Label className="mb-1.5">Telefon</Label>
                <Input value={data.agency_phone || ""} onChange={(e) => set("agency_phone", e.target.value)} placeholder="+90 5xx xxx xx xx" />
              </div>
              <div>
                <Label className="mb-1.5">Website</Label>
                <Input value={data.agency_website || ""} onChange={(e) => set("agency_website", e.target.value)} placeholder="https://ajans.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Fatura / Yasal Bilgiler</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5">Vergi Numarası</Label>
                <Input value={data.agency_tax_number || ""} onChange={(e) => set("agency_tax_number", e.target.value)} placeholder="1234567890" />
              </div>
              <div>
                <Label className="mb-1.5">Vergi Dairesi</Label>
                <Input value={data.agency_tax_office || ""} onChange={(e) => set("agency_tax_office", e.target.value)} placeholder="Kadıköy VD" />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1.5">Adres</Label>
                <Input value={data.agency_address || ""} onChange={(e) => set("agency_address", e.target.value)} placeholder="Mahalle, Cadde, No..." />
              </div>
              <div>
                <Label className="mb-1.5">Şehir</Label>
                <Input value={data.agency_city || ""} onChange={(e) => set("agency_city", e.target.value)} placeholder="İstanbul" />
              </div>
              <div>
                <Label className="mb-1.5">Ülke</Label>
                <Input value={data.agency_country || ""} onChange={(e) => set("agency_country", e.target.value)} placeholder="Türkiye" />
              </div>
              <div>
                <Label className="mb-1.5">IBAN</Label>
                <Input value={data.agency_iban || ""} onChange={(e) => set("agency_iban", e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" />
              </div>
              <div>
                <Label className="mb-1.5">Banka Adı</Label>
                <Input value={data.agency_bank_name || ""} onChange={(e) => set("agency_bank_name", e.target.value)} placeholder="Garanti BBVA" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Fatura Tercihleri</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-1.5">Varsayılan KDV Modu</Label>
                <Select value={data.default_tax_mode || "excluded"} onValueChange={(v) => set("default_tax_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excluded">KDV Hariç</SelectItem>
                    <SelectItem value="included">KDV Dahil</SelectItem>
                    <SelectItem value="none">KDV Yok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Varsayılan KDV Oranı (%)</Label>
                <Input type="number" value={data.default_tax_rate ?? 20} onChange={(e) => set("default_tax_rate", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="mb-1.5">Fatura Öneki</Label>
                <Input value={data.invoice_prefix || "FAT"} onChange={(e) => set("invoice_prefix", e.target.value)} placeholder="FAT" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Google Drive</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Bağlı
                </span>
                {settings?.drive_root_folder_url ? (
                  <a href={settings.drive_root_folder_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                    AjansPro Klasörünü Aç
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">İlk müşteri eklendiğinde root klasör otomatik oluşur.</span>
                )}
              </div>
              <div className="pt-3 border-t">
                <Button 
                  onClick={makeAllFilesPublic} 
                  disabled={makingPublic}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {makingPublic ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> İşleniyor...</>
                  ) : (
                    <><FolderOpen className="w-3.5 h-3.5 mr-2" /> Tüm Dosyaları Herkese Açık Yap</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Drive'daki tüm görseller uygulama içinde görünebilmesi için public yapılır. Tek seferde yapılır.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI & API */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Sağlayıcı & API Keyler</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1.5">Tercih Edilen Sağlayıcı</Label>
                <Select value={data.preferred_ai_provider} onValueChange={(v) => set("preferred_ai_provider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter (en ucuz, tüm modeller)</SelectItem>
                    <SelectItem value="gemini">Google Gemini (free tier)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Anahtarlar şifreli olarak saklanır ve kaydedildikten sonra bir daha
                gösterilmez. Kaydetmeden önce sağlayıcıya sorulup doğrulanır —
                geçersiz anahtar kaydedilmez.
              </p>
              <ApiKeyField label="OpenRouter API Key" provider="openrouter" saved={keyStatus.openrouter?.has_key} savedAt={keyStatus.openrouter?.updated_at} onChanged={refreshKeys} placeholder="sk-or-..." hint="openrouter.ai/keys'den oluşturabilirsin." />
              <ApiKeyField label="Google Gemini API Key" provider="gemini" saved={keyStatus.gemini?.has_key} savedAt={keyStatus.gemini?.updated_at} onChanged={refreshKeys} placeholder="AIza..." hint="aistudio.google.com'dan ücretsiz al." />
              <ApiKeyField label="OpenAI API Key" provider="openai" saved={keyStatus.openai?.has_key} savedAt={keyStatus.openai?.updated_at} onChanged={refreshKeys} placeholder="sk-..." />
              <ApiKeyField label="Anthropic API Key" provider="anthropic" saved={keyStatus.anthropic?.has_key} savedAt={keyStatus.anthropic?.updated_at} onChanged={refreshKeys} placeholder="sk-ant-..." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="w-4 h-4" /> Maliyet Yönetimi</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="cursor-pointer">Tasarruf Modu</Label>
                  <p className="text-xs text-muted-foreground">Sadece ucuz/free tier modeller kullanılır.</p>
                </div>
                <Switch checked={data.savings_mode} onCheckedChange={(v) => set("savings_mode", v)} />
              </div>
              <div>
                <Label className="mb-1.5">Aylık AI Bütçesi ($)</Label>
                <Input type="number" value={data.monthly_ai_budget} onChange={(e) => set("monthly_ai_budget", parseFloat(e.target.value) || 0)} />
              </div>
            </CardContent>
          </Card>

          {/* Google Drive + Gmail — Base44'te platformdaydı, artık burada. */}
          <GoogleBaglanti />
        </TabsContent>

        {/* AI MODEL SEÇİMİ */}
        <TabsContent value="model" className="space-y-4">
          <AIModelTab data={data} set={set} />
        </TabsContent>

        {/* ZEKA & PROAKTİF */}
        <TabsContent value="zeka" className="space-y-4">
          <IntelligenceTab data={data} set={set} />
        </TabsContent>

        {/* BİLDİRİMLER */}
        <TabsContent value="bildirimler" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Send className="w-4 h-4" /> Telegram Bildirimleri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Telegram Bildirimleri Aktif</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Kritik olaylar için Telegram mesajı gönderilir.</p>
                </div>
                <Switch checked={data.telegram_enabled} onCheckedChange={(v) => set("telegram_enabled", v)} />
              </div>

              <div>
                <Label className="mb-1.5">Bot Token</Label>
                <Input
                  type="password"
                  value={data.telegram_bot_token || ""}
                  onChange={(e) => set("telegram_bot_token", e.target.value)}
                  placeholder="7234567890:AAH..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Telegram'da @BotFather'a /newbot yaz → token al. Sonra bota /start yaz, <code className="bg-muted px-1 rounded">api.telegram.org/bot&#123;TOKEN&#125;/getUpdates</code> adresinden chat_id'ni bul.
                </p>
              </div>

              <div>
                <Label className="mb-1.5">Chat ID'ler</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newChatId}
                    onChange={(e) => setNewChatId(e.target.value)}
                    placeholder="123456789"
                    onKeyDown={(e) => e.key === "Enter" && addChatId()}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addChatId}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {(data.telegram_chat_ids || []).map((id) => (
                    <div key={id} className="flex items-center justify-between px-3 py-1.5 bg-muted rounded-md text-sm">
                      <span className="font-mono">{id}</span>
                      <button onClick={() => removeChatId(id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(data.telegram_chat_ids || []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Henüz chat ID eklenmedi.</p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={testTelegram}
                disabled={testingTelegram || !data.telegram_bot_token}
              >
                <Send className="w-4 h-4 mr-2" />
                {testingTelegram ? "Gönderiliyor..." : "Test Mesajı Gönder"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HATIRLATMALAR */}
        <TabsContent value="hatirlatmalar" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Hatırlatma Zamanlaması</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-1.5">Tekrarlayan Saati</Label>
                <Input type="time" value={data.recurring_reminder_time} onChange={(e) => set("recurring_reminder_time", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Hedef Eşik Gün</Label>
                <Input type="number" value={data.target_reminder_days} onChange={(e) => set("target_reminder_days", parseInt(e.target.value) || 7)} />
              </div>
              <div>
                <Label className="mb-1.5">Hedef Eşik %</Label>
                <Input type="number" value={data.target_reminder_threshold} onChange={(e) => set("target_reminder_threshold", parseInt(e.target.value) || 70)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EKİP */}
        <TabsContent value="ekip">
          <TeamTab />
        </TabsContent>

        {/* MALİYET */}
        <TabsContent value="maliyet">
          <CostTab monthlyBudget={data.monthly_ai_budget} />
        </TabsContent>

        {/* SAYFA ERİŞİMİ */}
        <TabsContent value="erisim">
          <PageAccessTab
            settings={settings}
            onUpdate={(newAccess) => {
              setData(d => ({ ...d, page_role_access: newAccess }));
            }}
          />
        </TabsContent>
      </Tabs>

      <Button onClick={() => save.mutate(data)} disabled={save.isPending} className="bg-accent hover:bg-accent/90 text-white">
        <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
      </Button>
    </div>
  );
}