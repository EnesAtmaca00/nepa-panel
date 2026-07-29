import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Send, AlertTriangle, Image, Video, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const PLATFORM_LABEL = {
  instagram_post: "Instagram Post", instagram_reels: "Instagram Reels", instagram_story: "Instagram Story",
  tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", linkedin: "LinkedIn", twitter: "Twitter/X", other: "Diğer",
};

const STATUS_BADGE = {
  scheduled: { label: "Planlandı", cls: "bg-blue-50 text-blue-700 border-blue-200", Icon: Clock },
  posting: { label: "Paylaşılıyor", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Send },
  published: { label: "Yayınlandı", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  failed: { label: "Başarısız", cls: "bg-red-50 text-red-700 border-red-200", Icon: AlertTriangle },
  cancelled: { label: "İptal", cls: "bg-slate-100 text-slate-600 border-slate-200", Icon: XCircle },
};

const APPROVAL_BADGE = {
  pending_approval: { label: "Onay Bekliyor", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  approved: { label: "Onaylı", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Reddedildi", cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function PublishQueueCard({ post, onApprove, onReject, onDelete }) {
  const status = STATUS_BADGE[post.status] || STATUS_BADGE.scheduled;
  const approval = APPROVAL_BADGE[post.approval_status];
  const StatusIcon = status.Icon;
  const isPending = post.approval_status === "pending_approval";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-semibold text-sm truncate">{post.company_name || "—"}</span>
            <Badge variant="outline" className="text-[10px]">{PLATFORM_LABEL[post.platform] || post.platform}</Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              {post.media_type === "video" ? <Video className="w-2.5 h-2.5" /> : <Image className="w-2.5 h-2.5" />}
              {post.media_type === "video" ? "Video" : "Görsel"}
            </Badge>
            {post.publish_type === "auto" && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Otomatik</Badge>}
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2 mb-1.5">{post.caption || "(açıklama yok)"}</p>
          {(post.hashtags || []).length > 0 && (
            <p className="text-xs text-accent line-clamp-1 mb-1.5">{post.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {post.scheduled_at ? format(new Date(post.scheduled_at), "d MMM yyyy HH:mm", { locale: tr }) : "—"}
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> {format(new Date(post.published_at), "d MMM HH:mm", { locale: tr })} yayınlandı
              </span>
            )}
          </div>
          {/* Hesap bazlı sonuçlar */}
          {(post.publish_results || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.publish_results.map((r, i) => (
                <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${r.success ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  @{r.username} {r.success ? "✓" : "✕ " + (r.error || "")}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            {approval && post.status === "scheduled" && (
              <Badge variant="outline" className={`text-[10px] ${approval.cls}`}>{approval.label}</Badge>
            )}
            <Badge variant="outline" className={`text-[10px] gap-1 ${status.cls}`}><StatusIcon className="w-2.5 h-2.5" /> {status.label}</Badge>
          </div>

          {isPending && post.status === "scheduled" && (
            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(post.id)}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Onayla
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => onReject(post.id)}>
                <XCircle className="w-3 h-3 mr-1" /> Reddet
              </Button>
            </div>
          )}
          {post.rejection_reason && (
            <p className="text-[10px] text-red-600 max-w-[160px] text-right">Red: {post.rejection_reason}</p>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(post.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}