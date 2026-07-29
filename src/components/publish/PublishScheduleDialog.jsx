import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Check, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import HashtagSetPicker from "@/components/hashtags/HashtagSetPicker";

const PLATFORMS = [
  { value: "instagram_post", label: "📸 Instagram Post" },
  { value: "instagram_reels", label: "🎬 Instagram Reels" },
  { value: "instagram_story", label: "⭕ Instagram Story" },
  { value: "tiktok", label: "🎵 TikTok" },
  { value: "youtube", label: "▶️ YouTube" },
  { value: "linkedin", label: "💼 LinkedIn" },
  { value: "facebook", label: "👤 Facebook" },
  { value: "twitter", label: "🐦 Twitter/X" },
  { value: "other", label: "📢 Diğer" },
];

const DEFAULT = {
  company_id: "",
  platform: "instagram_post",
  account_handle: "",
  scheduled_at: "",
  caption: "",
  hashtags: [],
  notes: "",
  status: "scheduled",
  publish_type: "manual",
};

export default function PublishScheduleDialog({ open, onOpenChange, schedule, companies = [], onMarkPublished }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(DEFAULT);

  useEffect(() => {
    if (schedule) setData(schedule);
    else setData(DEFAULT);
  }, [schedule, open]);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...data };
      if (data.company_id) {
        const c = companies.find(x => x.id === data.company_id);
        payload.company_name = c?.name;
      }
      if (typeof payload.hashtags === "string") {
        payload.hashtags = payload.hashtags.split(",").map(h => h.trim()).filter(Boolean);
      }
      if (data.id) return base44.entities.PublishSchedule.update(data.id, payload);
      return base44.entities.PublishSchedule.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules"] });
      toast.success(data.id ? "Güncellendi" : "Yayın planı eklendi");
      onOpenChange(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.PublishSchedule.update(data.id, { deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules"] });
      toast.success("Silindi");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{data.id ? "Yayın Planını Düzenle" : "Yeni Yayın Planı"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
                  {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Hesap (@kullanıcı)</Label>
              <Input value={data.account_handle || ""} onChange={(e) => set("account_handle", e.target.value)} placeholder="@hesap" />
            </div>
            <div>
              <Label className="mb-1.5">Yayın Tarihi & Saati</Label>
              <Input type="datetime-local" value={data.scheduled_at ? data.scheduled_at.slice(0, 16) : ""} onChange={(e) => set("scheduled_at", e.target.value + ":00")} />
            </div>
          </div>

          <div>
            <Label className="mb-1.5">Caption</Label>
            <Textarea value={data.caption || ""} onChange={(e) => set("caption", e.target.value)} rows={3} />
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
              value={Array.isArray(data.hashtags) ? data.hashtags.join(", ") : (data.hashtags || "")}
              onChange={(e) => set("hashtags", e.target.value)}
              placeholder="#marka, #ürün"
            />
          </div>

          <div>
            <Label className="mb-1.5">Durum</Label>
            <Select value={data.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Planlandı</SelectItem>
                <SelectItem value="published">Yayınlandı</SelectItem>
                <SelectItem value="failed">Başarısız</SelectItem>
                <SelectItem value="cancelled">İptal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5">İç Not</Label>
            <Input value={data.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Otomatik Paylaşım</p>
                <p className="text-xs text-muted-foreground">Belirlenen tarihte sistem otomatik olarak paylaşır</p>
              </div>
            </div>
            <Switch
              checked={data.publish_type === "auto"}
              onCheckedChange={(v) => set("publish_type", v ? "auto" : "manual")}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {data.id && (
            <>
              <Button variant="outline" size="sm" onClick={() => remove.mutate()} className="mr-auto">
                <Trash2 className="w-3 h-3 mr-1" /> Sil
              </Button>
              {data.status === "scheduled" && (
                <Button variant="outline" size="sm" onClick={() => {
                  onMarkPublished?.(data.id);
                  onOpenChange(false);
                }}>
                  <Check className="w-3 h-3 mr-1" /> Yayınlandı İşaretle
                </Button>
              )}
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !data.company_id}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}