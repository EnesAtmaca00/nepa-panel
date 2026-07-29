import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Hash, Plus, Trash2, Edit2, TrendingUp, BookMarked } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_LABELS = {
  all: "Tüm Platformlar", instagram_post: "📸 Instagram Post",
  instagram_reels: "🎬 Reels", instagram_story: "⭕ Story",
  tiktok: "🎵 TikTok", linkedin: "💼 LinkedIn",
  facebook: "👤 Facebook", twitter: "🐦 Twitter",
};

const SOURCE_LABELS = {
  manual: { label: "Manuel", cls: "bg-slate-100 text-slate-600" },
  competitor_analysis: { label: "Rakip Analizi", cls: "bg-amber-100 text-amber-700" },
  ai_generated: { label: "AI Üretimi", cls: "bg-violet-100 text-violet-700" },
};

const DEFAULT_FORM = {
  name: "", company_id: "", platform: "all", hashtags: [], description: "", source: "manual",
};

export default function HashtagLibrary({ companies = [] }) {
  const queryClient = useQueryClient();
  const [filterCompany, setFilterCompany] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [hashtagInput, setHashtagInput] = useState("");

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ["hashtag-sets-all"],
    queryFn: () => base44.entities.HashtagSet.list("-use_count", 200),
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (payload.company_id) {
        const c = companies.find(x => x.id === payload.company_id);
        payload.company_name = c?.name || "";
      }
      if (editing?.id) return base44.entities.HashtagSet.update(editing.id, payload);
      return base44.entities.HashtagSet.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hashtag-sets-all"] });
      queryClient.invalidateQueries({ queryKey: ["hashtag-sets"] });
      toast.success(editing?.id ? "Set güncellendi" : "Hashtag seti oluşturuldu");
      setDialogOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.HashtagSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hashtag-sets-all"] });
      queryClient.invalidateQueries({ queryKey: ["hashtag-sets"] });
      toast.success("Set silindi");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...DEFAULT_FORM, company_id: filterCompany !== "all" ? filterCompany : "" });
    setHashtagInput("");
    setDialogOpen(true);
  };

  const openEdit = (set) => {
    setEditing(set);
    setForm({ ...set });
    setHashtagInput((set.hashtags || []).join(", "));
    setDialogOpen(true);
  };

  const addHashtagsFromInput = () => {
    const tags = hashtagInput.split(/[,\s]+/).map(t => {
      t = t.trim();
      return t.startsWith("#") ? t : t ? `#${t}` : "";
    }).filter(Boolean);
    setForm(f => ({ ...f, hashtags: [...new Set([...(f.hashtags || []), ...tags])] }));
    setHashtagInput("");
  };

  const removeTag = (tag) => setForm(f => ({ ...f, hashtags: f.hashtags.filter(t => t !== tag) }));

  const filtered = sets.filter(s =>
    filterCompany === "all" || s.company_id === filterCompany
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Tüm Müşteriler" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Müşteriler</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs">{filtered.length} set</Badge>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Yeni Set
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-32 skeleton rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookMarked className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Henüz hashtag seti yok.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={openNew}>
              <Plus className="w-3.5 h-3.5 mr-1" /> İlk Seti Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(set => {
            const src = SOURCE_LABELS[set.source] || SOURCE_LABELS.manual;
            return (
              <Card key={set.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{set.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {set.company_name && (
                          <Badge variant="outline" className="text-[10px] h-4">{set.company_name}</Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] h-4 ${src.cls}`}>{src.label}</Badge>
                        {set.platform && set.platform !== "all" && (
                          <Badge variant="secondary" className="text-[10px] h-4">{PLATFORM_LABELS[set.platform] || set.platform}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(set)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => remove.mutate(set.id)} className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {(set.hashtags || []).slice(0, 8).map((tag, i) => (
                      <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{tag}</span>
                    ))}
                    {(set.hashtags || []).length > 8 && (
                      <span className="text-[10px] text-muted-foreground">+{set.hashtags.length - 8}</span>
                    )}
                  </div>
                  {set.use_count > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3" /> {set.use_count}x kullanıldı
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              {editing?.id ? "Seti Düzenle" : "Yeni Hashtag Seti"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5">Set Adı *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ör: Kahve İçerikleri, Haftalık Motivasyon" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Müşteri</Label>
                <Select value={form.company_id || "none"} onValueChange={v => setForm(f => ({ ...f, company_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Genel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Genel (tüm müşteriler)</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5">Hashtagler ekle</Label>
              <div className="flex gap-2">
                <Input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHashtagsFromInput()}
                  placeholder="#kahve, #marka veya boşlukla ayır"
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={addHashtagsFromInput}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {(form.hashtags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                {form.hashtags.map((tag, i) => (
                  <span key={i} className="flex items-center gap-0.5 text-xs bg-background border px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-0.5 text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            )}
            <div>
              <Label className="mb-1.5">Kaynak</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="competitor_analysis">Rakip Analizi</SelectItem>
                  <SelectItem value="ai_generated">AI Üretimi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}