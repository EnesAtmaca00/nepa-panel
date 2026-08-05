// ============================================================
// /tani — Teşhis sayfası
//
// NEDEN VAR: "veriler gelmiyor" durumunda sebebi bulmak için her
// seferinde birine sorup SQL çalıştırmak gerekiyordu. Bu sayfa aynı
// kontrolleri tarayıcıda, GERÇEK oturumunla çalıştırıp sonucu düz
// Türkçe yazıyor.
//
// Kritik nokta: RLS engeli HATA DEĞİL, boş sonuçtur. Yani "0 kayıt"
// ile "yetkin yok" ekranda aynı görünür. Bu sayfa ikisini ayırt
// ediyor — app_users satırının varlığını ayrıca kontrol ederek.
// ============================================================
import React, { useState } from "react";
import { supabase, base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";

const TABLOLAR = [
  "companies", "content_ideas", "tasks", "invoices",
  "app_settings", "app_users", "publish_schedules",
];

function Satir({ durum, baslik, detay }) {
  const Ikon = durum === "ok" ? CheckCircle2 : durum === "uyari" ? AlertTriangle : XCircle;
  const renk = durum === "ok" ? "text-emerald-600" : durum === "uyari" ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "hsl(var(--border-subtle))" }}>
      <Ikon className={`w-4 h-4 mt-0.5 shrink-0 ${renk}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{baslik}</p>
        {detay && <p className="text-xs text-muted-foreground mt-0.5 break-words">{detay}</p>}
      </div>
    </div>
  );
}

export default function Tani() {
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);

  const calistir = async () => {
    setCalisiyor(true);
    const r = { adimlar: [], ozet: "", ham: {} };
    const ekle = (durum, baslik, detay) => r.adimlar.push({ durum, baslik, detay });

    try {
      // ── 1. Oturum ──
      const t0 = performance.now();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        ekle("hata", "Oturum yok", "Giriş yapılmamış görünüyor.");
        r.ozet = "Oturum açık değil. Çıkıp yeniden giriş yap.";
        setSonuc(r); setCalisiyor(false); return;
      }
      const uid = session.user.id;
      const sonKullanma = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const suresiDoldu = sonKullanma && sonKullanma < new Date();
      ekle(suresiDoldu ? "hata" : "ok", "Oturum açık",
        `${session.user.email} · kimlik ${uid}` +
        (sonKullanma ? ` · token bitiş ${sonKullanma.toLocaleTimeString("tr-TR")}` : ""));
      r.ham.uid = uid;
      r.ham.email = session.user.email;

      // ── 2. app_users satırı ── EN KRİTİK KONTROL
      const { data: profil, error: pErr } = await supabase
        .from("app_users").select("*").eq("id", uid).maybeSingle();

      if (pErr) {
        ekle("hata", "app_users okunamadı", pErr.message);
      } else if (!profil) {
        ekle("hata", "app_users satırın YOK",
          "Sebep bu. Veritabanı kuralları auth kimliğinle eşleşen bir " +
          "app_users satırı arıyor; bulamayınca HER tabloyu boş " +
          "döndürüyor ve bu bir hata sayılmıyor. Aşağıdaki SQL'i çalıştır.");
        r.ozet = "app_users satırın yok — verilerin duruyor ama sana gösterilmiyor.";
      } else if (!profil.active) {
        ekle("hata", "Hesabın pasif", "app_users.active = false. Aşağıdaki SQL'i çalıştır.");
        r.ozet = "Hesabın pasif durumda.";
      } else {
        const kapsam = (profil.assigned_companies?.length ?? 0) === 0
          ? "tüm firmalar" : `${profil.assigned_companies.length} firma ile sınırlı`;
        ekle("ok", "app_users satırın var",
          `rol ${profil.role} · ajans rolü ${profil.agency_role} · aktif · kapsam: ${kapsam}`);
        if (profil.agency_role !== "admin" && profil.role !== "admin"
            && (profil.assigned_companies?.length ?? 0) > 0) {
          ekle("uyari", "Kapsam sınırlı",
            "Yalnızca atanmış firmaları görüyorsun. Diğerleri boş görünür, bu normal.");
        }
      }
      r.ham.profil = profil ?? null;

      // ── 3. Tablo tablo sayım ──
      const sayimlar = {};
      for (const t of TABLOLAR) {
        const bas = performance.now();
        const { count, error } = await supabase
          .from(t).select("*", { count: "exact", head: true });
        const sure = Math.round(performance.now() - bas);
        sayimlar[t] = { count, error: error?.message, sure };
        if (error) {
          ekle("hata", `${t} okunamadı`, error.message);
        } else {
          ekle(count > 0 ? "ok" : "uyari", `${t}: ${count} kayıt görünüyor`,
            `${sure} ms` + (count === 0 ? " — sıfır kayıt (ya gerçekten boş ya da yetki engeli)" : ""));
        }
      }
      r.ham.sayimlar = sayimlar;

      // ── 3b. SHIM YOLU ──
      // Kritik karşılaştırma: yukarıdaki sayımlar supabase.from() ile
      // DOĞRUDAN yapıldı. Sayfalar ise base44.entities.X.filter() ile
      // çekiyor. Biri çalışıp diğeri çalışmıyorsa sorun shim'de ya da
      // sorgu katmanındadır — veritabanında değil.
      const shim = {};
      try {
        const t1 = performance.now();
        const firmalar = await base44.entities.Company.filter(
          { deleted: false }, "-created_date", 200);
        shim.companies = { adet: firmalar.length, sure: Math.round(performance.now() - t1) };
        ekle(firmalar.length > 0 ? "ok" : "hata",
          `Shim (sayfaların kullandığı yol): ${firmalar.length} firma`,
          firmalar.length === 0
            ? "Ham sorgu veriyi görüyor ama shim göremiyor — sorun uygulama katmanında."
            : `${shim.companies.sure} ms · ilk kayıt: ${firmalar[0]?.name ?? "-"}`);
      } catch (e) {
        shim.companies = { hata: e.message };
        ekle("hata", "Shim ile firma çekilemedi", e.message);
      }

      try {
        const gorevler = await base44.entities.Task.filter({ deleted: false }, "-created_date", 50);
        shim.tasks = { adet: gorevler.length };
        ekle(gorevler.length > 0 ? "ok" : "uyari", `Shim: ${gorevler.length} görev`);
      } catch (e) {
        shim.tasks = { hata: e.message };
        ekle("hata", "Shim ile görev çekilemedi", e.message);
      }

      // Sıralamasız/filtresiz en yalın çağrı — sorun filtrede mi sıralamada mı?
      try {
        const yalin = await base44.entities.Company.list(null, 5);
        shim.yalin = yalin.length;
        ekle(yalin.length > 0 ? "ok" : "hata",
          `Shim yalın (filtresiz, sıralamasız): ${yalin.length} firma`,
          yalin.length > 0 && (shim.companies?.adet === 0)
            ? "Yalın çağrı çalışıyor ama filtreli çalışmıyor -> sorun deleted filtresinde veya sıralamada."
            : undefined);
      } catch (e) {
        shim.yalin = e.message;
        ekle("hata", "Shim yalın çağrı hatası", e.message);
      }
      r.ham.shim = shim;

      // Uygulamanın sürümü — eski build'e bakıyor olma ihtimalini eler
      r.ham.build = { zaman: __BUILD_ZAMANI__, adres: window.location.origin };
      ekle("ok", "Çalışan sürüm", `${__BUILD_ZAMANI__} · ${window.location.origin}`);

      // ── 4. Edge Function erişimi ──
      try {
        const bas = performance.now();
        const res = await base44.functions.invoke("testApiKey", { provider: "openrouter" });
        const sure = Math.round(performance.now() - bas);
        ekle(res.data ? "ok" : "uyari", "Edge Function erişimi",
          `${sure} ms · ${res.data?.message ?? "yanıt alındı"}`);
      } catch (e) {
        ekle("uyari", "Edge Function'a ulaşılamadı", e.message);
      }

      // ── 5. Toplam süre ──
      const toplam = Math.round(performance.now() - t0);
      ekle(toplam < 4000 ? "ok" : "uyari", `Tüm kontroller ${toplam} ms sürdü`,
        toplam < 4000 ? "Hız sorunu yok." : "Bağlantı yavaş olabilir.");

      if (!r.ozet) {
        const bosMu = Object.values(sayimlar).every((s) => (s.count ?? 0) === 0);
        r.ozet = bosMu
          ? "Yetki tamam ama tablolar boş görünüyor — veri gerçekten silinmiş olabilir. Yedekten geri yükleme gerekebilir."
          : "Her şey normal görünüyor. Veri geliyor.";
      }
    } catch (e) {
      ekle("hata", "Teşhis sırasında hata", e.message);
      r.ozet = e.message;
    }

    setSonuc(r);
    setCalisiyor(false);
  };

  const kopyala = () => {
    navigator.clipboard.writeText(JSON.stringify(sonuc?.ham ?? {}, null, 2));
    toast.success("Teknik detay kopyalandı");
  };

  const duzeltmeSQL = `insert into app_users (id, email, full_name, role, agency_role, active)
select id, email, coalesce(raw_user_meta_data->>'full_name', email), 'admin', 'admin', true
from auth.users where id = '${sonuc?.ham?.uid ?? "KIMLIK"}'
on conflict (id) do update
set active = true, role = 'admin', agency_role = 'admin';`;

  const gerekli = sonuc?.adimlar?.some(
    (a) => a.baslik.includes("app_users satırın YOK") || a.baslik.includes("Hesabın pasif"));

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Teşhis</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Veriler görünmüyorsa sebebini burası söyler.
        </p>
      </div>

      <Button onClick={calistir} disabled={calisiyor} className="gap-2">
        {calisiyor ? <><Loader2 className="w-4 h-4 animate-spin" /> Kontrol ediliyor…</> : "Kontrolleri Çalıştır"}
      </Button>

      {sonuc && (
        <>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Sonuç: {sonuc.ozet}</p>
              <div>
                {sonuc.adimlar.map((a, i) => (
                  <Satir key={i} durum={a.durum} baslik={a.baslik} detay={a.detay} />
                ))}
              </div>
            </CardContent>
          </Card>

          {gerekli && (
            <Card className="border-amber-300">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium">Düzeltme</p>
                <p className="text-xs text-muted-foreground">
                  Supabase &gt; SQL Editor'e yapıştırıp çalıştır, sonra bu sayfayı yenile.
                </p>
                <pre className="bg-muted p-3 rounded text-[11px] overflow-x-auto whitespace-pre-wrap">{duzeltmeSQL}</pre>
                <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => { navigator.clipboard.writeText(duzeltmeSQL); toast.success("SQL kopyalandı"); }}>
                  <Copy className="w-3.5 h-3.5" /> SQL'i Kopyala
                </Button>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" size="sm" onClick={kopyala} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" /> Teknik detayı kopyala
          </Button>
        </>
      )}
    </div>
  );
}
