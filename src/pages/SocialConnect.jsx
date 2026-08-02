import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Instagram, Facebook, Twitter, Linkedin, Link2, Unlink, Send,
  CheckCircle2, Smartphone, Info, BarChart2
} from "lucide-react";
import PerformanceDashboard from "@/components/social/PerformanceDashboard";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-600", bg: "bg-pink-50" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "tiktok", name: "TikTok", icon: Smartphone, color: "text-slate-800", bg: "bg-slate-50" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "text-blue-700", bg: "bg-blue-50" },
  { id: "twitter", name: "Twitter/X", icon: Twitter, color: "text-sky-500", bg: "bg-sky-50" },
];

export default function SocialConnect() {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [activeTab, setActiveTab] = useState("accounts"); // accounts | performance
  const [connectingPlatform, setConnectingPlatform] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    staleTime: Infinity,
  });

  const { data: connectedAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["social-accounts", selectedCompanyId],
    queryFn: () => base44.entities.SocialMediaAccount.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  // OAuth ile tek-tıkla bağlan: popup aç → kapanınca hesapları yenile
  const startOAuth = async (platform) => {
    if (!selectedCompanyId) { toast.error("Önce müşteri seçin"); return; }
    setConnectingPlatform(platform.id);
    try {
      const res = await base44.functions.invoke("socialOAuthStart", {
        company_id: selectedCompanyId,
        platform: platform.id,
      });
      if (!res.data?.auth_url) {
        toast.error(res.data?.error || "Yetkilendirme başlatılamadı");
        setConnectingPlatform(null);
        return;
      }
      const popup = window.open(res.data.auth_url, "_blank", "width=600,height=720");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setConnectingPlatform(null);
          queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
          toast.success(`${platform.name} bağlantısı kontrol ediliyor…`);
        }
      }, 600);
    } catch (err) {
      toast.error("Hata: " + err.message);
      setConnectingPlatform(null);
    }
  };

  const disconnectMutation = useMutation({
    mutationFn: (accountId) => base44.functions.invoke("disconnectSocial", { account_id: accountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
      toast.success("Bağlantı kesildi");
    },
    // onError yoktu: kesme başarısız olsa bile "kesildi" yazıyordu.
    onError: (e) => toast.error("Kesilemedi: " + (e?.message || "bilinmeyen hata")),
  });

  const testPostMutation = useMutation({
    mutationFn: (accountId) => base44.functions.invoke("testSocialPost", { account_id: accountId }),
    onSuccess: (res) => toast.success(res.data?.message || "Test gönderildi"),
    onError: (err) => toast.error("Test hatası: " + err.message),
  });

  const getAccount = (platformId) => connectedAccounts.find(a => a.platform === platformId && a.is_connected);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sosyal Medya</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hesap bağlantıları ve performans analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button variant={activeTab === "accounts" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("accounts")} className="gap-1.5 h-7 text-xs">
              <Link2 className="w-3.5 h-3.5" /> Hesaplar
            </Button>
            <Button variant={activeTab === "performance" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("performance")} className="gap-1.5 h-7 text-xs">
              <BarChart2 className="w-3.5 h-3.5" /> Performans
            </Button>
          </div>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Müşteri Seçin" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Performans Tab */}
      {activeTab === "performance" && (
        <PerformanceDashboard companyId={selectedCompanyId} />
      )}

      {activeTab === "accounts" && (!selectedCompanyId ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Link2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Müşteri seçin</p>
            <p className="text-sm text-muted-foreground">Sosyal medya hesaplarını görmek ve yönetmek için bir müşteri seçin.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2 text-sm text-emerald-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Tek tıkla bağlantı:</strong> "Bağlan" tuşuna bastığınızda platformun güvenli giriş ekranı açılır,
              müşteri onayladığında hesap otomatik bağlanır. Token kopyalamaya gerek yok.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORMS.map(platform => {
              const account = getAccount(platform.id);
              const Icon = platform.icon;
              return (
                <Card key={platform.id} className="overflow-hidden">
                  <div className={`h-1.5 ${platform.bg}`} style={{ background: platform.id === "instagram" ? "linear-gradient(90deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" : undefined }} />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${platform.color}`} />
                        <CardTitle className="text-sm">{platform.name}</CardTitle>
                      </div>
                      {account ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Bağlı
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Bağlı Değil</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {account ? (
                      <>
                        <div className="flex items-center gap-2 p-2 bg-muted/40 rounded">
                          <div className={`h-8 w-8 rounded-full ${platform.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-4 w-4 ${platform.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">@{account.account_username}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(account.created_date).toLocaleDateString("tr-TR")} tarihinden beri bağlı
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => testPostMutation.mutate(account.id)}
                            disabled={testPostMutation.isPending}
                          >
                            <Send className="w-3 h-3 mr-1" /> Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs text-destructive hover:text-destructive"
                            onClick={() => disconnectMutation.mutate(account.id)}
                            disabled={disconnectMutation.isPending}
                          >
                            <Unlink className="w-3 h-3 mr-1" /> Kes
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-xs text-muted-foreground mb-3">Bu platform henüz bağlanmadı.</p>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => startOAuth(platform)}
                          disabled={connectingPlatform === platform.id}
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1.5" />
                          {connectingPlatform === platform.id ? "Bağlanıyor…" : "Bağlan"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ))}

    </div>
  );
}