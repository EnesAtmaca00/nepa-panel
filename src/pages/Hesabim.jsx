import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Bell, Settings, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAgencyRole } from "@/lib/permissions";

const ROLE_LABELS = { admin: "Admin", manager: "Yönetici", editor: "Editör", viewer: "Görüntüleyici" };

export default function Hesabim() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 30000,
  });

  const [profile, setProfile] = useState({ phone: "", title: "", bio: "" });
  const [notifPrefs, setNotifPrefs] = useState({
    invoices: true, approvals: true, publish_reminders: true, team_updates: true,
    telegram_enabled: false, telegram_chat_id: "",
  });
  const [prefs, setPrefs] = useState({ theme: "system", week_start: "monday", currency: "TRY" });
  const [darkMode, setDarkModeState] = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    if (user) {
      setProfile({ phone: user.phone || "", title: user.title || "", bio: user.bio || "" });
      setNotifPrefs({ invoices: true, approvals: true, publish_reminders: true, team_updates: true, telegram_enabled: false, telegram_chat_id: "", ...(user.notification_preferences || {}) });
      setPrefs({ theme: "system", week_start: "monday", currency: "TRY", ...(user.preferences || {}) });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["current-user"] }); toast.success("Kaydedildi ✓"); },
  });

  const handleTheme = (theme) => {
    setPrefs((p) => ({ ...p, theme }));
    if (theme === "dark") { document.documentElement.classList.add("dark"); setDarkModeState(true); }
    else if (theme === "light") { document.documentElement.classList.remove("dark"); setDarkModeState(false); }
    else {
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (sys) { document.documentElement.classList.add("dark"); setDarkModeState(true); }
      else { document.documentElement.classList.remove("dark"); setDarkModeState(false); }
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/";
  };

  const sendTestTelegram = async () => {
    if (!notifPrefs.telegram_chat_id) { toast.error("Telegram Chat ID gerekli"); return; }
    try {
      await base44.functions.invoke("sendTelegramNotification", {
        chat_id: notifPrefs.telegram_chat_id,
        message: "✅ Ne-Pa Panel test bildirimi başarılı!",
      });
      toast.success("Test bildirimi gönderildi");
    } catch (e) { toast.error("Gönderilemedi: " + e.message); }
  };

  const role = getAgencyRole(user);

  if (isLoading) return <div className="py-20 text-center text-muted-foreground text-sm">Yükleniyor...</div>;

  const initials = user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-accent font-semibold text-lg">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-medium">{user?.full_name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[role] || "Görüntüleyici"}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> Profil</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" /> Bildirimler</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Tercihler</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Güvenlik</TabsTrigger>
        </TabsList>

        {/* Profil */}
        <TabsContent value="profile" className="mt-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Tam Ad</label>
                <Input value={user?.full_name || ""} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground mt-1 font-serif italic">Bu alan hesap yöneticisi tarafından değiştirilebilir.</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1 block">E-posta</label>
                <Input value={user?.email || ""} disabled className="bg-muted/50" />
              </div>
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Telefon</label>
                <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+90 532 xxx xx xx" />
              </div>
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Ünvan</label>
                <Input value={profile.title} onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))} placeholder="Sosyal Medya Uzmanı" />
              </div>
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Bio</label>
                <textarea
                  className="w-full rounded-[8px] border px-3 py-2 text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                  style={{ borderColor: "hsl(var(--border))", minHeight: 72 }}
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Kısa bir tanıtım..."
                />
              </div>
              <Button onClick={() => updateMutation.mutate({ phone: profile.phone, title: profile.title, bio: profile.bio })} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bildirimler */}
        <TabsContent value="notifications" className="mt-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              {[
                { key: "invoices", label: "Fatura bildirimleri" },
                { key: "approvals", label: "İçerik onay bildirimleri" },
                { key: "publish_reminders", label: "Yayın hatırlatıcıları" },
                { key: "team_updates", label: "Ekip güncellemeleri" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <button
                    onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${notifPrefs[key] ? "bg-accent" : "bg-muted-foreground/40"}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white transition-transform ${notifPrefs[key] ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Telegram Bildirimleri</span>
                  <button
                    onClick={() => setNotifPrefs((p) => ({ ...p, telegram_enabled: !p.telegram_enabled }))}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${notifPrefs.telegram_enabled ? "bg-accent" : "bg-muted-foreground/40"}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white transition-transform ${notifPrefs.telegram_enabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                {notifPrefs.telegram_enabled && (
                  <div>
                    <label className="text-[13px] font-medium text-muted-foreground mb-1 block">Kişisel Telegram Chat ID</label>
                    <div className="flex gap-2">
                      <Input value={notifPrefs.telegram_chat_id} onChange={(e) => setNotifPrefs((p) => ({ ...p, telegram_chat_id: e.target.value }))} placeholder="123456789" />
                      <Button variant="outline" size="sm" onClick={sendTestTelegram}>Test</Button>
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={() => updateMutation.mutate({ notification_preferences: notifPrefs })} disabled={updateMutation.isPending}>Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tercihler */}
        <TabsContent value="preferences" className="mt-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Tema</label>
                <div className="flex gap-2">
                  {[{ v: "light", l: "Açık" }, { v: "dark", l: "Koyu" }, { v: "system", l: "Sistem" }].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => handleTheme(v)}
                      className={`flex-1 py-2 text-sm rounded-[8px] border transition-colors ${prefs.theme === v ? "border-accent bg-accent/10 text-accent font-medium" : "border-border hover:bg-muted"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Para Birimi</label>
                <div className="flex gap-2">
                  {[{ v: "TRY", l: "₺ Türk Lirası" }, { v: "EUR", l: "€ Euro" }].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setPrefs((p) => ({ ...p, currency: v }))}
                      className={`flex-1 py-2 text-sm rounded-[8px] border transition-colors ${prefs.currency === v ? "border-accent bg-accent/10 text-accent font-medium" : "border-border hover:bg-muted"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] font-medium text-muted-foreground mb-2 block">Hafta Başlangıcı</label>
                <div className="flex gap-2">
                  {[{ v: "monday", l: "Pazartesi" }, { v: "sunday", l: "Pazar" }].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setPrefs((p) => ({ ...p, week_start: v }))}
                      className={`flex-1 py-2 text-sm rounded-[8px] border transition-colors ${prefs.week_start === v ? "border-accent bg-accent/10 text-accent font-medium" : "border-border hover:bg-muted"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => updateMutation.mutate({ preferences: prefs })} disabled={updateMutation.isPending}>Kaydet</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Güvenlik */}
        <TabsContent value="security" className="mt-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground font-serif italic">Şifre ve e-posta değişikliği platform üzerinden yönetilir.</p>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Son giriş:</span> {new Date().toLocaleDateString("tr-TR")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Çıkış */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button variant="destructive" className="gap-2" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Çıkış Yap
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive/60 hover:text-destructive text-xs"
          onClick={() => {
            if (window.confirm("Hesabını silmek istediğine emin misin? Bu işlem geri alınamaz.")) {
              toast.error("Hesap silme için yöneticiye başvur.");
            }
          }}
        >
          <Trash2 className="w-3 h-3 mr-1" /> Hesabı Sil
        </Button>
      </div>
    </div>
  );
}