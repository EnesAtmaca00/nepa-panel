// ============================================================
// API anahtarı alanı — yaz-only.
//
// Base44'te anahtar app_settings tablosuna DÜZ METİN yazılıyordu ve
// ekrana geri okunuyordu. Sızıntı bu yüzden oldu (GUVENLIK-UYARISI.md).
//
// Yeni davranış:
//   - Yazdığın anahtar Supabase Vault'a şifreli kaydedilir
//   - Kaydetmeden ÖNCE sağlayıcıya sorulup doğrulanır; geçersizse kaydedilmez
//   - Kaydedilen anahtar bir daha ekrana GELMEZ, sadece "Kayıtlı ✓" görünür
//   - Kaybedersen yenisini üretip tekrar girersin
//
// Anahtar tarayıcıdan yalnızca YUKARI gider; hiçbir zaman geri inmez.
// ============================================================
import React, { useState } from "react";
import { base44, supabase } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Check, X, Loader2, Plug, Save, Trash2 } from "lucide-react";

export default function ApiKeyField({ label, provider, placeholder, hint, saved, savedAt, onChanged }) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(null);   // null | "ok" | "fail"
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(null);       // null | "test" | "save" | "delete"

  /** Test: taslak doluysa onu, boşsa KAYITLI anahtarı dener. */
  const test = async () => {
    if (!draft.trim() && !saved) {
      setStatus("fail"); setMessage("Önce anahtarı gir");
      return;
    }
    setBusy("test"); setStatus(null); setMessage("");
    try {
      const res = await base44.functions.invoke("testApiKey", {
        provider,
        ...(draft.trim() ? { api_key: draft.trim() } : {}),
      });
      const d = res.data || {};
      setStatus(d.ok ? "ok" : "fail");
      setMessage(d.ok ? (d.sample ? `Bağlandı • ${d.sample}` : "Bağlandı") : (d.message || "Bağlanamadı"));
    } catch (e) {
      setStatus("fail"); setMessage(e.message || "Bağlantı hatası");
    } finally { setBusy(null); }
  };

  /** Kaydet: önce doğrula, geçerse kasaya yaz. Geçersiz anahtar kaydedilmez. */
  const save = async () => {
    const key = draft.trim();
    if (!key) { setStatus("fail"); setMessage("Anahtar boş"); return; }
    setBusy("save"); setStatus(null); setMessage("Doğrulanıyor…");
    try {
      const res = await base44.functions.invoke("testApiKey", { provider, api_key: key });
      const d = res.data || {};
      if (!d.ok) {
        setStatus("fail");
        setMessage(`Kaydedilmedi — ${d.message || "anahtar doğrulanamadı"}`);
        return;
      }
      setMessage("Kaydediliyor…");
      const { error } = await supabase.rpc("set_provider_key", { p_provider: provider, p_key: key });
      if (error) throw new Error(error.message);

      setDraft("");
      setStatus("ok");
      setMessage(d.sample ? `Kaydedildi • ${d.sample}` : "Kaydedildi");
      onChanged?.();
    } catch (e) {
      setStatus("fail"); setMessage(e.message || "Kaydedilemedi");
    } finally { setBusy(null); }
  };

  const remove = async () => {
    setBusy("delete"); setStatus(null); setMessage("");
    try {
      const { error } = await supabase.rpc("delete_provider_key", { p_provider: provider });
      if (error) throw new Error(error.message);
      setMessage("Anahtar silindi");
      onChanged?.();
    } catch (e) {
      setStatus("fail"); setMessage(e.message || "Silinemedi");
    } finally { setBusy(null); }
  };

  return (
    <div>
      <Label className="mb-1.5 flex items-center justify-between">
        <span><Key className="w-3 h-3 inline mr-1" /> {label}</span>
        <span className="flex items-center gap-1.5">
          {saved && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-normal">
              <Check className="w-3 h-3 mr-1" /> Kayıtlı
            </Badge>
          )}
          {status === "ok" && !saved && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-normal">
              <Check className="w-3 h-3 mr-1" /> Bağlandı
            </Badge>
          )}
          {status === "fail" && (
            <Badge className="bg-red-100 text-red-700 border-red-200 font-normal">
              <X className="w-3 h-3 mr-1" /> Sorun var
            </Badge>
          )}
        </span>
      </Label>

      <div className="flex gap-2">
        <Input
          type="password"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setStatus(null); setMessage(""); }}
          placeholder={saved ? "•••••••• (değiştirmek için yeni anahtar yapıştır)" : placeholder}
          className="flex-1"
          autoComplete="off"
        />
        <Button type="button" variant="outline" onClick={test} disabled={!!busy} title="Anahtarı sağlayıcıya sorup doğrular">
          {busy === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plug className="w-3 h-3 mr-1" /> Test</>}
        </Button>
        <Button type="button" onClick={save} disabled={!!busy || !draft.trim()} title="Doğrulayıp şifreli olarak kaydeder">
          {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3 h-3 mr-1" /> Kaydet</>}
        </Button>
        {saved && (
          <Button type="button" variant="ghost" size="icon" onClick={remove} disabled={!!busy} title="Kayıtlı anahtarı sil">
            {busy === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
          </Button>
        )}
      </div>

      {message && (
        <p className={`text-xs mt-1 ${status === "ok" ? "text-emerald-600" : status === "fail" ? "text-red-600" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}
      {!message && saved && savedAt && (
        <p className="text-xs text-muted-foreground mt-1">
          Son güncelleme: {new Date(savedAt).toLocaleString("tr-TR")} · anahtar güvenlik gereği geri gösterilmiyor
        </p>
      )}
      {!message && !saved && hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
