import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload, Search, Star, StarOff, Trash2, Tag,
  Image, Video, Copy, Check, FolderOpen, Plus, X, HardDriveUpload, ExternalLink
} from "lucide-react";

// Drive webViewLink veya uc?export=view URL'ini önizlenebilir thumbnail URL'e çevir
function resolveMediaUrl(url, thumb = false) {
  if (!url) return null;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return thumb
      ? `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w600`
      : `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  }
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return thumb
      ? `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w600`
      : `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  }
  return url;
}

const CATEGORIES = [
  { value: "all", label: "Tümü" },
  { value: "product", label: "Ürün" },
  { value: "lifestyle", label: "Yaşam Tarzı" },
  { value: "brand", label: "Marka" },
  { value: "event", label: "Etkinlik" },
  { value: "people", label: "İnsanlar" },
  { value: "background", label: "Arka Plan" },
  { value: "graphic", label: "Grafik" },
  { value: "other", label: "Diğer" },
];

const SOURCE_LABELS = {
  ai_generated: { label: "AI Üretilen", color: "bg-purple-100 text-purple-700 border-purple-200" },
  uploaded: { label: "Yüklendi", color: "bg-blue-100 text-blue-700 border-blue-200" },
  content_idea: { label: "İçerik'ten", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const PLATFORM_OPTIONS = ["instagram_post", "instagram_reels", "instagram_story", "tiktok", "linkedin", "facebook"];
const PLATFORM_LABELS_MAP = {
  instagram_post: "Instagram Post", instagram_reels: "Reels",
  instagram_story: "Story", tiktok: "TikTok", linkedin: "LinkedIn", facebook: "Facebook",
};

export default function MediaLibrary() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef();

  const [companyId, setCompanyId] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [favOnly, setFavOnly] = useState(false);

  const [editAsset, setEditAsset] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Tag input
  const [tagInput, setTagInput] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["media-assets", companyId],
    queryFn: () => {
      const filter = { deleted: false };
      if (companyId !== "all") filter.company_id = companyId;
      return base44.entities.MediaAsset.filter(filter, "-created_date", 500);
    },
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MediaAsset.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-assets"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaAsset.update(id, { deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
      toast.success("Silindi");
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (companyId === "all") { toast.error("Yüklemek için önce firma seçin"); return; }
    const company = companies.find(c => c.id === companyId);
    setUploading(true);
    try {
      for (const file of files) {
        // KREDİ TASARRUFU: Core.UploadFile kullanma (kredi yakar). Drive zorunlu.
        if (!company?.drive_folder_id) {
          toast.error(`${file.name}: Firmanın Drive klasörü yok. Önce Drive klasörü oluştur.`);
          continue;
        }

        let driveDirectUrl = null;
        let driveThumbnailUrl = null;
        try {
          const reader = new FileReader();
          const base64 = await new Promise((resolve) => {
            reader.onload = (ev) => resolve(ev.target.result.split(",")[1]);
            reader.readAsDataURL(file);
          });
          const driveRes = await base44.functions.invoke("uploadFileToDrive", {
            company_id: companyId,
            category: "Görseller",
            filename: file.name,
            mime_type: file.type,
            file_base64: base64,
          });
          const driveData = driveRes.data || driveRes;
          if (driveData.success) {
            driveDirectUrl = driveData.file?.drive_url;
            driveThumbnailUrl = driveData.file?.thumbnail_url;
          } else {
            throw new Error(driveData.error || "Drive yükleme başarısız");
          }
        } catch (driveErr) {
          toast.error(`${file.name}: ${driveErr.message}`);
          continue;
        }

        await base44.entities.MediaAsset.create({
          company_id: companyId,
          company_name: company?.name,
          file_url: driveDirectUrl,
          thumbnail_url: driveThumbnailUrl,
          file_name: file.name,
          file_type: file.type.startsWith("video") ? "video" : "image",
          source: "uploaded",
          title: file.name.replace(/\.[^.]+$/, ""),
          category: "other",
          tags: [],
          platform_fit: [],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["media-assets"] });
      toast.success(`Drive'a yüklendi`);
    } catch (err) {
      toast.error("Yükleme hatası: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const copyUrl = (asset) => {
    navigator.clipboard.writeText(asset.file_url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("URL kopyalandı");
  };

  const saveEdit = async () => {
    if (!editAsset) return;
    await updateMutation.mutateAsync({ id: editAsset.id, data: {
      title: editAsset.title,
      category: editAsset.category,
      tags: editAsset.tags,
      platform_fit: editAsset.platform_fit,
      notes: editAsset.notes,
    }});
    toast.success("Kaydedildi");
    setEditAsset(null);
  };

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (!t || (editAsset.tags || []).includes(t)) return;
    setEditAsset(prev => ({ ...prev, tags: [...(prev.tags || []), t] }));
    setTagInput("");
  };

  const removeTag = (tag) => {
    setEditAsset(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const togglePlatformFit = (p) => {
    setEditAsset(prev => ({
      ...prev,
      platform_fit: (prev.platform_fit || []).includes(p)
        ? prev.platform_fit.filter(x => x !== p)
        : [...(prev.platform_fit || []), p],
    }));
  };

  // Filtrelenmiş sonuçlar
  const filtered = assets.filter(a => {
    if (favOnly && !a.favorite) return false;
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (sourceFilter !== "all" && a.source !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.title?.toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q)) ||
        a.file_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Medya Kütüphanesi</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Firma bazlı görsel ve video varlıkları — AI üretilen, yüklenen, etiketlenen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
          <Button
            onClick={() => { if (companyId === "all") { toast.error("Önce firma seçin"); return; } fileInputRef.current?.click(); }}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Yükleniyor..." : "Dosya Yükle"}
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Firma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Firmalar</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Kaynak" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kaynaklar</SelectItem>
            <SelectItem value="ai_generated">AI Üretilen</SelectItem>
            <SelectItem value="uploaded">Yüklendi</SelectItem>
            <SelectItem value="content_idea">İçerik'ten</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Başlık, etiket, dosya adı..." className="h-8 text-xs pl-8" />
        </div>

        <button
          onClick={() => setFavOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 h-8 text-xs rounded-md border transition-all ${favOnly ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-background text-muted-foreground"}`}
        >
          <Star className="w-3.5 h-3.5" /> Favoriler
        </button>

        <Badge variant="secondary" className="text-xs ml-auto">
          {filtered.length} sonuç
        </Badge>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square skeleton rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <FolderOpen className="w-12 h-12 text-muted-foreground opacity-30" />
            <p className="font-medium text-sm">Medya bulunamadı</p>
            <p className="text-xs text-muted-foreground">Dosya yükleyin veya AI Studio'dan görsel oluşturun</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(asset => (
            <div key={asset.id} className="group relative rounded-lg overflow-hidden border bg-card hover:shadow-md transition-all">
              {/* Thumbnail */}
              <div
                className="aspect-square bg-muted cursor-pointer overflow-hidden"
                onClick={() => setPreviewAsset(asset)}
              >
                {asset.file_type === "video" ? (
                  <video src={resolveMediaUrl(asset.file_url)} className="w-full h-full object-cover" muted />
                ) : (
                  <img
                    src={asset.thumbnail_url ? resolveMediaUrl(asset.thumbnail_url, true) : resolveMediaUrl(asset.file_url, true)}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.target.src = resolveMediaUrl(asset.file_url); }}
                  />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); copyUrl(asset); }} className="p-1.5 bg-white rounded-full shadow">
                    {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setEditAsset({ ...asset }); }} className="p-1.5 bg-white rounded-full shadow">
                    <Tag className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm("Silinsin mi?")) deleteMutation.mutate(asset.id); }}
                    className="p-1.5 bg-white rounded-full shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{asset.title || asset.file_name}</p>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex gap-1 flex-wrap">
                    {asset.source && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${SOURCE_LABELS[asset.source]?.color}`}>
                        {SOURCE_LABELS[asset.source]?.label}
                      </span>
                    )}
                    {asset.file_type === "video" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                        Video
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => updateMutation.mutate({ id: asset.id, data: { favorite: !asset.favorite } })}
                    className={`transition-colors ${asset.favorite ? "text-amber-500" : "text-muted-foreground hover:text-amber-400"}`}
                  >
                    {asset.favorite ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {(asset.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {asset.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[9px] bg-muted px-1 py-0.5 rounded">{t}</span>
                    ))}
                    {asset.tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{asset.tags.length - 3}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Önizleme Dialog */}
      <Dialog open={!!previewAsset} onOpenChange={v => !v && setPreviewAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">{previewAsset?.title || previewAsset?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden bg-muted max-h-[60vh] flex items-center justify-center">
            {previewAsset?.file_type === "video" ? (
              <video src={resolveMediaUrl(previewAsset?.file_url)} controls className="max-h-[60vh] w-full object-contain" />
            ) : (
              <img
                src={resolveMediaUrl(previewAsset?.file_url)}
                alt=""
                className="max-h-[60vh] w-full object-contain"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          {previewAsset?.file_url?.includes("drive.google.com") && (
            <Button variant="outline" size="sm" className="gap-1 w-full mt-1" onClick={() => window.open(previewAsset.file_url, "_blank")}>
              <ExternalLink className="w-3.5 h-3.5" /> Drive'da Aç
            </Button>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {previewAsset?.source && (
              <Badge variant="outline" className={`text-xs ${SOURCE_LABELS[previewAsset.source]?.color}`}>
                {SOURCE_LABELS[previewAsset.source]?.label}
              </Badge>
            )}
            {(previewAsset?.tags || []).map(t => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
            {previewAsset?.ai_prompt && (
              <div className="w-full mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                <span className="font-semibold">AI Prompt:</span> {previewAsset.ai_prompt}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => copyUrl(previewAsset)} className="gap-2">
              <Copy className="w-3.5 h-3.5" /> URL Kopyala
            </Button>
            <Button size="sm" onClick={() => { setPreviewAsset(null); setEditAsset({ ...previewAsset }); }} className="gap-2">
              <Tag className="w-3.5 h-3.5" /> Düzenle/Etiketle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Düzenleme/Etiketleme Dialog */}
      <Dialog open={!!editAsset} onOpenChange={v => !v && setEditAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4" /> Etiketle & Kategorize Et
            </DialogTitle>
          </DialogHeader>
          {editAsset && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs">Başlık</Label>
                <Input
                  value={editAsset.title || ""}
                  onChange={e => setEditAsset(p => ({ ...p, title: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Kategori</Label>
                <Select value={editAsset.category || "other"} onValueChange={v => setEditAsset(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== "all").map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">Etiketler</Label>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {(editAsset.tags || []).map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                      {t}
                      <button onClick={() => removeTag(t)}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addTag(tagInput)}
                    placeholder="Etiket ekle..."
                    className="h-8 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={() => addTag(tagInput)} className="h-8 px-2">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">Uygun Platformlar</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_OPTIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePlatformFit(p)}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                        (editAsset.platform_fit || []).includes(p)
                          ? "bg-gold text-slate-900 border-gold"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {PLATFORM_LABELS_MAP[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">Notlar</Label>
                <Input
                  value={editAsset.notes || ""}
                  onChange={e => setEditAsset(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Bu görsel hakkında not..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditAsset(null)}>İptal</Button>
            <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}