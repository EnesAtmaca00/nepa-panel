// ============================================================
// Google Drive + Gmail bağlantı kartı.
//
// Base44'te bu bağlantı platform tarafından yönetiliyordu ve panelden
// görünmüyordu. Artık Enes buradan bağlıyor, durumu görüyor, kesiyor.
//
// GÜVENLİK: token'lar bu bileşene HİÇ gelmiyor. google_connection_status()
// sadece "bağlı mı, hangi hesap, hangi izinler" döndürüyor.
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Link2, Unlink, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/api/base44Client";

const IZIN_ADI = {
  "https://www.googleapis.com/auth/drive.file": "Drive — bu uygulamanın dosyaları",
  "https://www.googleapis.com/auth/gmail.readonly": "Gmail — okuma",
  "https://www.googleapis.com/auth/gmail.compose": "Gmail — taslak yazma",
  "https://www.googleapis.com/auth/userinfo.email": "E-posta adresi",
};

export default function GoogleBaglanti() {
  const [durum, setDurum] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islem, setIslem] = useState(false);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await supabase.rpc("google_connection_status");
    if (error) setHata(error.message);
    else setDurum(Array.isArray(data) ? data[0] : data);
    setYukleniyor(false);
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  // Callback panele ?google=ok / ?google=error ile dönüyor.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("google");
    if (!g) return;
    if (g === "ok") setBasari(`Google bağlandı${p.get("hesap") ? `: ${p.get("hesap")}` : ""}`);
    else setHata(p.get("mesaj") || "Google bağlantısı başarısız");
    // Adres çubuğunu temizle ki yenilemede mesaj tekrar çıkmasın.
    window.history.replaceState({}, "", window.location.pathname);
    yukle();
  }, [yukle]);

  async function bagla() {
    setIslem(true); setHata(""); setBasari("");
    try {
      const { data, error } = await supabase.functions.invoke("googleOAuthStart", {
        body: { return_to: window.location.origin + window.location.pathname },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Google adresi alınamadı");
      window.location.href = data.url;   // Google onay ekranına git
    } catch (e) {
      setHata(e.message);
      setIslem(false);
    }
  }

  async function kes() {
    if (!window.confirm("Google bağlantısı kesilecek. Drive klasörleri ve Gmail kutusu panelden erişilemez olacak. Devam?")) return;
    setIslem(true); setHata(""); setBasari("");
    const { error } = await supabase.rpc("google_disconnect");
    if (error) setHata(error.message);
    else { setBasari("Bağlantı kesildi"); await yukle(); }
    setIslem(false);
  }

  const bagli = !!durum?.connected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="w-4 h-4" /> Google Drive & Gmail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-500">
          Şirket klasörlerinin Drive'da oluşturulması ve Gelen Kutusu özetinin
          çalışması için gerekli. Tek onayla ikisi birden bağlanır.
        </p>

        {hata && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{hata}</AlertDescription>
          </Alert>
        )}
        {basari && (
          <Alert>
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{basari}</AlertDescription>
          </Alert>
        )}

        {yukleniyor ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Durum okunuyor…
          </div>
        ) : bagli ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Bağlı</Badge>
              {durum.account_email && (
                <span className="text-sm font-medium">{durum.account_email}</span>
              )}
              {durum.expired && (
                <Badge variant="destructive">Süresi doldu — yeniden bağlayın</Badge>
              )}
            </div>

            {durum.scopes?.length > 0 && (
              <ul className="text-xs text-slate-500 space-y-0.5">
                {durum.scopes.map((s) => (
                  <li key={s}>• {IZIN_ADI[s] || s}</li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={bagla} disabled={islem}>
                {islem ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hesabı değiştir"}
              </Button>
              <Button variant="outline" size="sm" onClick={kes} disabled={islem}
                      className="text-red-600 hover:text-red-700">
                <Unlink className="w-4 h-4 mr-1" /> Bağlantıyı kes
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={bagla} disabled={islem}>
            {islem ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
            Google'a Bağlan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
