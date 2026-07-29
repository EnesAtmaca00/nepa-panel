import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send, Check, Radio, Image, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import PillarBadge from "@/components/content/PillarBadge";
import { useNavigate } from "react-router-dom";
import { PLATFORMS, PLATFORM_LABELS, todayISO } from "@/lib/format";
import { toast } from "sonner";
import HashtagSetPicker from "@/components/hashtags/HashtagSetPicker";
import ContentImageGenerator from "@/components/content/ContentImageGenerator";
import ApprovalWorkflowStepper from "@/components/content/ApprovalWorkflowStepper";

const DEFAULT = {
  company_id: "",
  title: "",
  platform: "instagram_post",
  topic: "",
  hook: "",
  generated_brief: "",
  caption: "",
  hashtags: [],
  scheduled_date: todayISO(),
  work_status: "not_started",
  approval_mode: "manual_internal",
  approval_status: "pending_internal",
};

export default function ContentIdeaDialog({ open, onOpenChange, idea, defaultDate, companies = [] }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [data, setData] = useState(DEFAULT);
  const [showImageGen, setShowImageGen] = useState(false);

  useEffect(() => {
    if (idea) {
      setData(idea);
    } else {
      setData({ ...DEFAULT, scheduled_date: defaultDate || todayISO() });
    }
  }, [idea, defaultDate, open]);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      // Madde 1: content_pillar zorunlu
      if (!data.content_pillar) {
        throw new Error("Lütfen içerik kategorisi seçin.");
      }
      const payload = { ...data };
      if (data.company_id) {
        const c = companies.find(x => x.id === data.company_id);
        payload.company_name = c?.name;
      }
      if (typeof payload.hashtags === "string") {
        payload.hashtags = payload.hashtags.split(",").map(h => h.trim()).filter(Boolean);
      }
      if (data.id) return base44.entities.ContentIdea.update(data.id, payload);
      return base44.entities.ContentIdea.create(payload);
    },
    onError: (err) => {
      toast.error(err?.message || "Kayıt başarısız");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["company-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success(data.id ? "Güncellendi" : "Eklendi");
      onOpenChange(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.ContentIdea.update(data.id, { deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["company-ideas"] });
      toast.success("İçerik arşivlendi");
      onOpenChange(false);
    },
  });

  const sendForApproval = async () => {
    try {
      const token = (Math.random().toString(36).slice(2) + Date.now().toString(36)).toUpperCase();
      await base44.entities.ClientApproval.create({
        content_idea_id: data.id,
        company_id: data.company_id,
        company_name: data.company_name,
        public_token: token,
        sent_at: new Date().toISOString(),
        status: "pending",
      });
      await base44.entities.ContentIdea.update(data.id, {
        approval_mode: "client_approval",
        approval_status: "sent_to_client",
      });
      const link = `${window.location.origin}/onay/${token}`;
      navigator.clipboard.writeText(link);
      toast.success("Onay linki oluşturuldu ve panoya kopyalandı");
      queryClient.invalidateQueries();
      onOpenChange(false);
    } catch (e) {
      toast.error("Hata: " + (e.message || ""));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data.id ? "İçeriği Düzenle" : "Yeni İçerik"}</DialogTitle>
        </DialogHeader>
        {data.id && data.approval_mode !== "none" && (
          <div className="p-3 rounded-lg bg-muted/30 border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Onay İş Akışı</div>
            <ApprovalWorkflowStepper status={data.approval_status} size="md" />
          </div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Müşteri</Label>
              <Select value={data.company_id} onValueChange={(v) => set("company_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Platform</Label>
              <Select value={data.platform} onValueChange={(v) => set("platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5">Başlık</Label>
            <Input value={data.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <div>
            <Label className="mb-1.5">Hook</Label>
            <Input value={data.hook} onChange={(e) => set("hook", e.target.value)} placeholder="İlk 3 saniye / ilk satır" />
          </div>

          <div>
            <Label className="mb-1.5">Brief</Label>
            <Textarea value={data.generated_brief} onChange={(e) => set("generated_brief", e.target.value)} rows={3} />
          </div>

          <div>
            <Label className="mb-1.5">Caption</Label>
            <Textarea value={data.caption} onChange={(e) => set("caption", e.target.value)} rows={4} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Hashtags</Label>
              <HashtagSetPicker
                companyId={data.company_id}
                currentHashtags={Array.isArray(data.hashtags) ? data.hashtags : (data.hashtags || "").split(",").map(t => t.trim()).filter(Boolean)}
                onApply={(tags) => set("hashtags", tags)}
              />
            </div>
            <Input
              value={Array.isArray(data.hashtags) ? data.hashtags.join(", ") : data.hashtags}
              onChange={(e) => set("hashtags", e.target.value)}
              placeholder="#kahve, #marka, #lifestyle"
            />
          </div>

          {/* Görsel Oluşturma */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 hover:bg-muted/30 text-sm font-medium"
              onClick={() => setShowImageGen(v => !v)}
            >
              <span className="flex items-center gap-2">
                <Image className="w-4 h-4 text-violet-500" />
                AI ile Görsel Oluştur
              </span>
              {showImageGen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showImageGen && (
              <div className="p-3 border-t bg-muted/10">
                <ContentImageGenerator
                  idea={data}
                  company={companies.find(c => c.id === data.company_id)}
                  onSave={async (imageUrl) => {
                    const mediaUrls = Array.isArray(data.media_urls) ? [...data.media_urls, imageUrl] : [imageUrl];
                    set("media_urls", mediaUrls);
                    if (data.id) {
                      await base44.entities.ContentIdea.update(data.id, { media_urls: mediaUrls });
                    }
                  }}
                />
                {Array.isArray(data.media_urls) && data.media_urls.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {data.media_urls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="h-16 w-16 object-cover rounded border" />
                        <button
                          className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                          onClick={() => set("media_urls", data.media_urls.filter((_, j) => j !== i))}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Tarih</Label>
              <Input type="date" value={data.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5">Üretim Durumu</Label>
              <Select value={data.work_status} onValueChange={(v) => set("work_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Başlamadı</SelectItem>
                  <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                  <SelectItem value="ready">Hazır</SelectItem>
                  <SelectItem value="published">Yayınlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Onay Modu</Label>
              <Select value={data.approval_mode} onValueChange={(v) => {
                set("approval_mode", v);
                if (v === "none") set("approval_status", "approved");
                else if (v === "manual_internal") set("approval_status", "pending_internal");
                else if (v === "client_approval") set("approval_status", "pending_internal");
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Onay Yok</SelectItem>
                  <SelectItem value="manual_internal">İç Onay</SelectItem>
                  <SelectItem value="client_approval">Müşteri Onayı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Onay Durumu</Label>
              <Select value={data.approval_status} onValueChange={(v) => set("approval_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_required">Gerekmez</SelectItem>
                  <SelectItem value="pending_internal">İç Onay Bekliyor</SelectItem>
                  <SelectItem value="approved">Onaylı</SelectItem>
                  <SelectItem value="sent_to_client">Müşteriye Gönderildi</SelectItem>
                  <SelectItem value="client_approved">Müşteri Onayladı</SelectItem>
                  <SelectItem value="revision_requested">Revizyon İstendi</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5">
                İçerik Direği (Pillar) <span className="text-red-500">*</span>
              </Label>
              <Select value={data.content_pillar || ""} onValueChange={(v) => set("content_pillar", v || null)}>
                <SelectTrigger className={!data.content_pillar ? "border-red-300" : ""}>
                  <SelectValue placeholder="Zorunlu — kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="egit">📚 Eğit</SelectItem>
                  <SelectItem value="eglendir">🎭 Eğlendir</SelectItem>
                  <SelectItem value="sat">💰 Sat</SelectItem>
                  <SelectItem value="guven">🤝 Güven</SelectItem>
                </SelectContent>
              </Select>
              {!data.content_pillar && (
                <p className="text-xs text-red-600 mt-1">⚠️ Lütfen içerik kategorisi seçin.</p>
              )}
            </div>
          </div>

          {/* Audit sonucu (varsa göster) */}
          {data.audit_score != null && (
            <div className={`p-3 rounded-lg border ${data.audit_score >= 65 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className={`w-4 h-4 ${data.audit_score >= 65 ? "text-emerald-600" : "text-rose-600"}`} />
                <span className="text-sm font-semibold">Auditor Skoru: {data.audit_score}/100</span>
              </div>
              {data.audit_suggestions && (
                <p className="text-xs text-muted-foreground">{data.audit_suggestions}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {data.id && (
            <Button variant="outline" size="sm" onClick={() => remove.mutate()} className="mr-auto">
              <Trash2 className="w-3 h-3 mr-1" /> Sil
            </Button>
          )}
          {data.id && data.approval_mode === "client_approval" && data.approval_status !== "client_approved" && (
            <Button variant="outline" size="sm" onClick={sendForApproval}>
              <Send className="w-3 h-3 mr-1" /> Müşteriye Gönder
            </Button>
          )}
          {data.id && (data.approval_status === "approved" || data.approval_status === "client_approved") && (
            <Button variant="outline" size="sm" onClick={() => {
              onOpenChange(false);
              navigate(`/icerik-takvimi?tab=publish&prefill=${encodeURIComponent(JSON.stringify({ company_id: data.company_id, company_name: data.company_name, content_idea_id: data.id, caption: data.caption, hashtags: data.hashtags, platform: data.platform }))}`);
            }}>
              <Radio className="w-3 h-3 mr-1" /> Yayın Planına Ekle
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !data.title}>
            <Check className="w-3 h-3 mr-1" /> Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}