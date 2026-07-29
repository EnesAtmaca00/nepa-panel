import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Star, ExternalLink, MoreVertical, Image, Video,
  FileText, Mic, Palette, Camera, Film, Share2, BarChart3, Zap,
  Layers, Lightbulb, Box, Wrench, X, ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Kategori meta ─── */
const CATEGORIES = {
  ai_image:      { label: "AI Görsel",      icon: Image,     color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  ai_video:      { label: "AI Video",       icon: Video,     color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  ai_text:       { label: "AI Metin",       icon: FileText,  color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  ai_audio:      { label: "AI Ses",         icon: Mic,       color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  design:        { label: "Tasarım",        icon: Palette,   color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30" },
  stock_media:   { label: "Stok Medya",     icon: Camera,    color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  video_editing: { label: "Video Düzenleme",icon: Film,      color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  social_media:  { label: "Sosyal Medya",   icon: Share2,    color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
  analytics:     { label: "Analitik",       icon: BarChart3, color: "text-green-500",   bg: "bg-green-50 dark:bg-green-950/30" },
  automation:    { label: "Otomasyon",      icon: Zap,       color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  productivity:  { label: "Verimlilik",     icon: Layers,    color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800/40" },
  inspiration:   { label: "İlham",          icon: Lightbulb, color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  research:      { label: "Araştırma",      icon: Search,    color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  other:         { label: "Diğer",          icon: Box,       color: "text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/40" },
};

/* ─── Tool Card ─── */
function ToolCard({ tool, onEdit, onDelete, onToggleFavorite }) {
  const qc = useQueryClient();
  const meta = CATEGORIES[tool.category] || CATEGORIES.other;
  const CatIcon = meta.icon;

  const handleOpen = async () => {
    window.open(tool.url, "_blank");
    try {
      await base44.entities.ResourceTool.update(tool.id, {
        click_count: (tool.click_count || 0) + 1,
        last_clicked_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["resource-tools"] });
    } catch {}
  };

  return (
    <div
      className="group bg-card border rounded-[10px] overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
      style={{ borderColor: "hsl(var(--border-default))" }}
      onClick={handleOpen}
    >
      {/* Thumbnail */}
      <div className="h-28 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative">
        {tool.thumbnail_url ? (
          <img
            src={tool.thumbnail_url}
            alt={tool.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bg}`}>
            <CatIcon className={`w-6 h-6 ${meta.color}`} />
          </div>
        )}
        {/* Kategori badge overlay */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-medium ${meta.bg} ${meta.color}`}>
            <CatIcon style={{ width: 10, height: 10 }} />
            {meta.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm text-foreground leading-snug flex-1 truncate">{tool.name}</h3>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleFavorite(tool)}
              className={`p-1 rounded transition-colors ${tool.favorite ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
            >
              <Star style={{ width: 13, height: 13, fill: tool.favorite ? "currentColor" : "none" }} />
            </button>
            <button
              onClick={() => window.open(tool.url, "_blank")}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink style={{ width: 13, height: 13 }} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                  <MoreVertical style={{ width: 13, height: 13 }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(tool)}>Düzenle</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(tool)}
                >
                  Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {tool.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3 flex-1">
            {tool.description}
          </p>
        )}

        {/* Tags */}
        {tool.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tool.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 mt-auto pt-2 border-t" style={{ borderColor: "hsl(var(--border-subtle))" }}>
          <span className={`text-[11px] font-medium ${tool.is_free ? "text-success" : "text-warning"}`}>
            {tool.is_free ? "Ücretsiz" : tool.pricing_note || "Ücretli"}
          </span>
          {(tool.click_count || 0) > 0 && (
            <span className="font-mono text-[11px] text-muted-foreground ml-auto">
              {tool.click_count}× açıldı
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Add/Edit Form Modal ─── */
function ToolFormModal({ open, onClose, editingTool }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", url: "", description: "", category: "other",
    tags: "", is_free: true, pricing_note: "", use_cases: "", notes: "", source: "",
  });
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [thumbnail, setThumbnail] = useState("");

  useEffect(() => {
    if (editingTool) {
      setForm({
        name: editingTool.name || "",
        url: editingTool.url || "",
        description: editingTool.description || "",
        category: editingTool.category || "other",
        tags: (editingTool.tags || []).join(", "),
        is_free: editingTool.is_free !== false,
        pricing_note: editingTool.pricing_note || "",
        use_cases: editingTool.use_cases || "",
        notes: editingTool.notes || "",
        source: editingTool.source || "",
      });
      setThumbnail(editingTool.thumbnail_url || "");
    } else {
      setForm({ name: "", url: "", description: "", category: "other", tags: "", is_free: true, pricing_note: "", use_cases: "", notes: "", source: "" });
      setThumbnail("");
    }
  }, [editingTool, open]);

  const fetchMeta = async (url) => {
    if (!url || !url.startsWith("http")) return;
    setLoadingMeta(true);
    try {
      const res = await base44.functions.invoke("fetchUrlMetadata", { url });
      const data = res.data;
      setForm((f) => ({
        ...f,
        name: f.name || data.title || "",
        description: f.description || data.description || "",
      }));
      if (data.thumbnail) setThumbnail(data.thumbnail);
    } catch {}
    setLoadingMeta(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const payload = {
        name: form.name,
        url: form.url,
        description: form.description,
        category: form.category,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        is_free: form.is_free,
        pricing_note: form.pricing_note,
        use_cases: form.use_cases,
        notes: form.notes,
        source: form.source,
        thumbnail_url: thumbnail,
        deleted: false,
      };
      if (editingTool) {
        return base44.entities.ResourceTool.update(editingTool.id, payload);
      } else {
        return base44.entities.ResourceTool.create({ ...payload, added_by: user?.id, click_count: 0 });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resource-tools"] });
      toast.success(editingTool ? "Araç güncellendi." : "Araç eklendi.");
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-medium">{editingTool ? "Aracı Düzenle" : "Yeni Araç Ekle"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* URL */}
          <div>
            <label className="text-[13px] font-medium text-secondary mb-1 block">URL <span className="text-destructive text-xs">*</span></label>
            <div className="flex gap-2">
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                onBlur={(e) => fetchMeta(e.target.value)}
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchMeta(form.url)}
                disabled={loadingMeta}
                className="shrink-0"
              >
                {loadingMeta ? "..." : "Meta Çek"}
              </Button>
            </div>
            {thumbnail && (
              <div className="mt-2 flex items-center gap-2">
                <img src={thumbnail} alt="" className="w-8 h-8 rounded object-cover border" />
                <span className="text-xs text-muted-foreground truncate flex-1">{thumbnail}</span>
                <button onClick={() => setThumbnail("")} className="text-muted-foreground hover:text-foreground">
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
          </div>

          {/* İsim */}
          <div>
            <label className="text-[13px] font-medium text-secondary mb-1 block">İsim <span className="text-destructive text-xs">*</span></label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Araç adı"
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="text-[13px] font-medium text-secondary mb-1 block">Açıklama</label>
            <textarea
              className="w-full rounded-[8px] border px-3 py-2 text-sm bg-transparent resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ borderColor: "hsl(var(--border))", minHeight: 72 }}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ne işe yarıyor?"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="text-[13px] font-medium text-secondary mb-1 block">Kategori</label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[13px] font-medium text-secondary mb-1 block">Etiketler</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="ücretsiz, ai, görsel (virgülle ayır)"
            />
          </div>

          {/* Ücretsiz */}
          <div className="flex items-center justify-between p-3 rounded-[8px] bg-muted">
            <span className="text-sm">Ücretsiz mi?</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_free: !f.is_free }))}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.is_free ? "bg-accent" : "bg-muted-foreground/40"}`}
            >
              <span className={`w-4 h-4 rounded-full bg-white transition-transform ${form.is_free ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          {!form.is_free && (
            <div>
              <label className="text-[13px] font-medium text-secondary mb-1 block">Fiyat Notu</label>
              <Input
                value={form.pricing_note}
                onChange={(e) => setForm((f) => ({ ...f, pricing_note: e.target.value }))}
                placeholder="Aylık $9, kullanım başına $0.05..."
              />
            </div>
          )}

          {/* Kullanım durumu */}
          <div>
            <label className="text-[13px] font-medium text-secondary mb-1 block">Hangi durumda kullanırız?</label>
            <textarea
              className="w-full rounded-[8px] border px-3 py-2 text-sm bg-transparent resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ borderColor: "hsl(var(--border))", minHeight: 60 }}
              value={form.use_cases}
              onChange={(e) => setForm((f) => ({ ...f, use_cases: e.target.value }))}
              placeholder="Müşteriye stok görsel lazım olduğunda..."
            />
          </div>

          {/* Kaynak */}
          <div>
            <label className="text-[13px] font-medium text-secondary mb-1 block">Kaynak (opsiyonel)</label>
            <Input
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="Instagram - @design_tools"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Vazgeç</Button>
            <Button
              className="flex-1"
              onClick={() => saveMutation.mutate()}
              disabled={!form.name || !form.url || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Kaydediliyor..." : editingTool ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Ana Sayfa ─── */
export default function Araclar() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [freeFilter, setFreeFilter] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);

  const { data: tools = [] } = useQuery({
    queryKey: ["resource-tools"],
    queryFn: () => base44.entities.ResourceTool.filter({ deleted: false }, "-created_date", 200),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ResourceTool.update(id, { deleted: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resource-tools"] }); toast.success("Araç silindi."); },
  });

  const toggleFavMutation = useMutation({
    mutationFn: (tool) => base44.entities.ResourceTool.update(tool.id, { favorite: !tool.favorite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resource-tools"] }),
  });

  const filtered = useMemo(() => {
    let list = tools;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);
    if (freeFilter === "free") list = list.filter((t) => t.is_free !== false);
    if (freeFilter === "paid") list = list.filter((t) => t.is_free === false);
    if (onlyFavorites) list = list.filter((t) => t.favorite);

    if (sortBy === "newest") list = [...list].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortBy === "popular") list = [...list].sort((a, b) => (b.click_count || 0) - (a.click_count || 0));
    else if (sortBy === "alpha") list = [...list].sort((a, b) => a.name?.localeCompare(b.name, "tr"));

    return list;
  }, [tools, search, categoryFilter, freeFilter, onlyFavorites, sortBy]);

  // Popüler tag'ler
  const popularTags = useMemo(() => {
    const map = {};
    tools.forEach((t) => t.tags?.forEach((tag) => { map[tag] = (map[tag] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);
  }, [tools]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground tracking-tight">Araç Kutusu</h1>
          <p className="font-serif italic text-muted-foreground text-sm mt-0.5">
            Denk geldikçe biriktirdiğimiz iyi şeyler.
          </p>
        </div>
        <Button
          onClick={() => { setEditingTool(null); setModalOpen(true); }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Yeni Araç
        </Button>
      </div>

      {/* Filtre bar */}
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-[10px] border" style={{ borderColor: "hsl(var(--border-default))" }}>
        {/* Arama */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, açıklama, etiket..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Kategori */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 text-sm w-40">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ücret */}
        <Select value={freeFilter} onValueChange={setFreeFilter}>
          <SelectTrigger className="h-8 text-sm w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hepsi</SelectItem>
            <SelectItem value="free">Ücretsiz</SelectItem>
            <SelectItem value="paid">Ücretli</SelectItem>
          </SelectContent>
        </Select>

        {/* Sıralama */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-8 text-sm w-36">
            <ArrowUpDown className="w-3 h-3 mr-1 opacity-50" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">En Yeni</SelectItem>
            <SelectItem value="popular">En Çok Tıklanan</SelectItem>
            <SelectItem value="alpha">İsim A-Z</SelectItem>
          </SelectContent>
        </Select>

        {/* Favoriler toggle */}
        <button
          onClick={() => setOnlyFavorites((v) => !v)}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm border transition-colors ${
            onlyFavorites
              ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-700 dark:text-yellow-400"
              : "border-input text-muted-foreground hover:bg-muted"
          }`}
        >
          <Star style={{ width: 12, height: 12, fill: onlyFavorites ? "currentColor" : "none" }} />
          Favoriler
        </button>
      </div>

      {/* Popüler tag'ler */}
      {popularTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearch(tag)}
              className="text-[11px] px-2 py-0.5 rounded-[4px] bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Sonuç sayısı */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} araç
          {tools.length !== filtered.length && ` / ${tools.length} toplam`}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <h3 className="font-serif italic text-2xl text-muted-foreground">Burası henüz boş.</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {search || categoryFilter !== "all"
              ? "Aradığını bulamadım. Filtreleri değiştirmeyi dene."
              : "İlk aracı ekleyince, burada listelenecek."}
          </p>
          {!search && categoryFilter === "all" && (
            <Button
              className="mt-6"
              onClick={() => { setEditingTool(null); setModalOpen(true); }}
            >
              + Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={(t) => { setEditingTool(t); setModalOpen(true); }}
              onDelete={(t) => deleteMutation.mutate(t.id)}
              onToggleFavorite={(t) => toggleFavMutation.mutate(t)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <ToolFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTool(null); }}
        editingTool={editingTool}
      />
    </div>
  );
}