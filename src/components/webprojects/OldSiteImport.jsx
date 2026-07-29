import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, Download, Check, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SECTION_LABELS = {
  firma_tanitimi: "Firma Tanıtımı",
  hakkimizda: "Hakkımızda",
  misyon: "Misyon",
  vizyon: "Vizyon",
  degerler: "Değerler",
  urunler_hizmetler: "Ürünler / Hizmetler",
  musteri_yorumlari: "Müşteri Yorumları",
  iletisim: "İletişim",
  one_cikan_bilgiler: "Öne Çıkan Bilgiler",
};

function hasContent(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.values(v).some(Boolean);
  return Boolean(v && String(v).trim());
}

export default function OldSiteImport({ data, setData }) {
  const [loading, setLoading] = useState(false);
  const content = data.old_website_content || {};
  const hasData = Object.keys(content).filter(k => !k.startsWith("_")).some(k => hasContent(content[k]));

  const handleFetch = async () => {
    const url = (data.old_website_url || "").trim();
    if (!url) {
      toast.error("Önce eski site adresini girin.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("extractOldSiteContent", { url });
      const out = res.data || res;
      if (out?.error) {
        toast.error(out.error);
      } else if (out?.content) {
        setData({ ...data, old_website_content: out.content });
        toast.success("Eski siteden içerik çekildi.");
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "İçerik çekilemedi. Site erişilebilir mi?");
    } finally {
      setLoading(false);
    }
  };

  const clearContent = () => setData({ ...data, old_website_content: {} });

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-4 space-y-3">
      <Label className="flex items-center gap-1.5 text-sky-900">
        <Globe className="w-3.5 h-3.5" /> Eski / Mevcut Web Sitesi
      </Label>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Firmanın mevcut sitesini girin — hakkımızda, misyon, vizyon, ürünler ve müşteri
        yorumları gibi bilgiler otomatik çekilip yeni site briefine eklenir.
      </p>
      <div className="flex gap-2">
        <Input
          value={data.old_website_url || ""}
          onChange={(e) => setData({ ...data, old_website_url: e.target.value })}
          placeholder="https://eskisite.com"
          className="flex-1 bg-white"
        />
        <Button
          type="button"
          onClick={handleFetch}
          disabled={loading}
          className="bg-sky-600 hover:bg-sky-700 text-white shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="ml-1 hidden sm:inline">{loading ? "Çekiliyor..." : "İçerik Çek"}</span>
        </Button>
      </div>

      {hasData && (
        <div className="rounded-md bg-white border border-sky-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Çekilen İçerik
            </span>
            <button type="button" onClick={clearContent} className="text-muted-foreground hover:text-rose-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(SECTION_LABELS).filter(k => hasContent(content[k])).map(k => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {SECTION_LABELS[k]}
              </span>
            ))}
          </div>
          {hasContent(content.hakkimizda) && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 pt-1 border-t border-sky-100">
              {String(content.hakkimizda).slice(0, 160)}…
            </p>
          )}
        </div>
      )}
    </div>
  );
}