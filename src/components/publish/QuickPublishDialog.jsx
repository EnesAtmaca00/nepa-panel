import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Instagram, Facebook, Twitter, Linkedin, Smartphone, Zap, CheckCircle2, Image, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import HashtagSetPicker from "@/components/hashtags/HashtagSetPicker";

const PLATFORM_ICON = { instagram: Instagram, facebook: Facebook, tiktok: Smartphone, linkedin: Linkedin, twitter: Twitter };
const PLATFORM_OPTS = [
  { value: "instagram_post", label: "📸 Instagram Post", key: "instagram" },
  { value: "instagram_reels", label: "🎬 Instagram Reels", key: "instagram" },
  { value: "instagram_story", label: "⭕ Instagram Story", key: "instagram" },
  { value: "tiktok", label: "🎵 TikTok", key: "tiktok" },
  { value: "facebook", label: "👤 Facebook", key: "facebook" },
  { value: "linkedin", label: "💼 LinkedIn", key: "linkedin" },
  { value: "twitter", label: "🐦 Twitter/X", key: "twitter" },
];

const EMPTY = {
  company_id: "", platform: "instagram_post", media_type: "image",
  scheduled_at: "", caption: "", hashtags: [], media_urls: [],
  target_account_ids: [], publish_type: "auto", requireApproval: false,
  tiktok_post_mode: "inbox",
};

export default function QuickPublishDialog({ open, onOpenChange, companies = [] }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(EMPTY);
  const [mediaInput, setMediaInput] = useState("");
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  useEffect(() => { if (open) { setData(EMPTY); setMediaInput(""); } }, [open]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["social-accounts", data.company_id],
    queryFn: () => base44.entities.SocialMediaAccount.filter({ company_id: data.company_id, is_connected: true }),
    enabled: !!data.company_id,
  });

  const platformKey = data.platform?.replace(/_post|_reels|_story/, "");
  const matchingAccounts = accounts.filter(a => a.platform === platformKey);

  const toggleAccount = (id) => {
    setData(d => ({
      ...d,
      target_account_ids: d.target_account_ids.includes(id)
        ? d.target_account_ids.filter(x => x !== id)
        : [...d.target_account_ids, id],
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const c = companies.find(x => x.id === data.company_id);
      const hashtags = Array.isArray(data.hashtags)
        ? data.hashtags
        : (data.hashtags || "").split(",").map(h => h.trim()).filter(Boolean);
      const media_urls = mediaInput.split(/[\n,]/).map(u => u.trim()).filter(Boolean);
      return base44.entities.PublishSchedule.create({
        company_id: data.company_id,
        company_name: c?.name || "",
        platform: data.platform,
        media_type: data.media_type,
        scheduled_at: data.scheduled_at,
        caption: data.caption,
        hashtags,
        media_urls,
        target_account_ids: data.target_account_ids,
        publish_type: data.publish_type,
        tiktok_post_mode: data.tiktok_post_mode,
        approval_status: data.requireApproval ? "pending_approval" : "approved",
        status: "scheduled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules"] });
      toast.success("Paylaşım sıraya eklendi");
      onOpenChange(false);
    },
    onError: (e) => toast.error("Hata: " + e.message),
  });

  const needsMedia = !data.platform.includes("story") || true;
  const valid = data.company_id && data.scheduled_at && data.caption;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Hızlı Paylaşım</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 -mx-1 px-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Müşteri</Label>
              <Select value={data.company_id} onValueChange={(v) => setData(d => ({ ...d, company_id: v, target_account_ids: [] }))}>
                <SelectTrigger className="h-11 sm:h-9"><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Platform</Label>
              <Select value={data.platform} onValueChange={(v) => setData(d => ({ ...d, platform: v, target_account_ids: [] }))}>
                <SelectTrigger className="h-11 sm:h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORM_OPTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Hesap seçimi */}
          {data.company_id && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Paylaşılacak Hesaplar</Label>
                <span className="text-[10px] text-muted-foreground">Hiçbiri seçilmezse uyan tüm hesaplara paylaşılır</span>
              </div>
              {matchingAccounts.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" /> Bu platformda bağlı hesap yok
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {matchingAccounts.map(a => {
                    const Icon = PLATFORM_ICON[a.platform] || Instagram;
                    const selected = data.target_account_ids.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAccount(a.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs transition-colors min-h-[36px] ${selected ? "bg-accent text-accent-foreground border-accent" : "bg-background hover:bg-muted"}`}
                      >
                        <Icon className="w-3.5 h-3.5" /> @{a.account_username}
                        {selected && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Yayın Tarihi & Saati</Label>
              <Input type="datetime-local" className="h-11 sm:h-9" value={data.scheduled_at ? data.scheduled_at.slice(0, 16) : ""} onChange={(e) => set("scheduled_at", e.target.value + ":00")} />
            </div>
            <div>
              <Label className="mb-1.5">İçerik Türü</Label>
              <div className="flex gap-2">
                <Button type="button" variant={data.media_type === "image" ? "default" : "outline"} className="flex-1 h-11 sm:h-9" onClick={() => set("media_type", "image")}><Image className="w-4 h-4 mr-1" /> Görsel</Button>
                <Button type="button" variant={data.media_type === "video" ? "default" : "outline"} className="flex-1 h-11 sm:h-9" onClick={() => set("media_type", "video")}><Video className="w-4 h-4 mr-1" /> Video</Button>
              </div>
            </div>
          </div>

          {data.platform === "tiktok" && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <Label className="text-xs mb-2 block">TikTok Paylaşım Modu</Label>
              <div className="flex gap-2">
                <Button type="button" variant={data.tiktok_post_mode === "inbox" ? "default" : "outline"} className="flex-1 h-11 sm:h-9 text-xs" onClick={() => set("tiktok_post_mode", "inbox")}>
                  Taslağa Gönder
                </Button>
                <Button type="button" variant={data.tiktok_post_mode === "direct" ? "default" : "outline"} className="flex-1 h-11 sm:h-9 text-xs" onClick={() => set("tiktok_post_mode", "direct")}>
                  Otomatik Yayınla
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {data.tiktok_post_mode === "inbox"
                  ? "Video müşterinin TikTok taslaklarına düşer, müşteri onaylayıp yayınlar (audit gerekmez)."
                  : "Video doğrudan yayınlanır — TikTok app'inizin Direct Post iznine onaylı olması gerekir."}
              </p>
            </div>
          )}

          <div>
            <Label className="mb-1.5">{data.media_type === "video" ? "Video URL" : "Görsel URL"} (birden fazla için virgül/satır)</Label>
            <Textarea value={mediaInput} onChange={(e) => setMediaInput(e.target.value)} rows={2} placeholder="https://..." />
          </div>

          <div>
            <Label className="mb-1.5">Açıklama (Caption)</Label>
            <Textarea value={data.caption} onChange={(e) => set("caption", e.target.value)} rows={3} placeholder="Paylaşım metni..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Hashtags</Label>
              <HashtagSetPicker
                companyId={data.company_id}
                currentHashtags={Array.isArray(data.hashtags) ? data.hashtags : []}
                onApply={(tags) => set("hashtags", tags)}
              />
            </div>
            <Input
              value={Array.isArray(data.hashtags) ? data.hashtags.join(", ") : data.hashtags}
              onChange={(e) => set("hashtags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
              className="h-11 sm:h-9"
              placeholder="#marka, #ürün"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Otomatik Paylaşım</p>
                <p className="text-xs text-muted-foreground">Sistem belirtilen saatte otomatik paylaşır</p>
              </div>
            </div>
            <Switch checked={data.publish_type === "auto"} onCheckedChange={(v) => set("publish_type", v ? "auto" : "manual")} />
          </div>

          {data.publish_type === "auto" && (
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Paylaşım öncesi onayım gereksin</p>
                  <p className="text-xs text-muted-foreground">Açıksa siz onaylamadan paylaşılmaz</p>
                </div>
              </div>
              <Switch checked={data.requireApproval} onCheckedChange={(v) => set("requireApproval", v)} />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button className="w-full sm:w-auto" onClick={() => save.mutate()} disabled={!valid || save.isPending}>
            {save.isPending ? "Ekleniyor..." : "Sıraya Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}