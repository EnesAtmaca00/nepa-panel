import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import PublishScheduleDialog from "@/components/publish/PublishScheduleDialog";

const PLATFORM_ICONS = {
  instagram_post: "📸", instagram_reels: "🎬", instagram_story: "⭕",
  tiktok: "🎵", youtube: "▶️", linkedin: "💼", facebook: "👤", twitter: "🐦", other: "📢",
};
const STATUS_STYLES = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
};
const STATUS_LABELS = { scheduled: "Planlandı", published: "Yayınlandı", failed: "Başarısız", cancelled: "İptal" };

export default function TabPublish({ company }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: schedules = [] } = useQuery({
    queryKey: ["publish-schedules", company.id],
    queryFn: () => base44.entities.PublishSchedule.filter({ company_id: company.id, deleted: false }, "-scheduled_at", 100),
    initialData: [],
  });

  const markPublished = useMutation({
    mutationFn: (id) => base44.entities.PublishSchedule.update(id, {
      status: "published",
      published_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules", company.id] });
      toast.success("Yayınlandı olarak işaretlendi");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Yayın Planları</h3>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Yeni Plan
        </Button>
      </div>

      {schedules.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          Henüz yayın planı yok.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {schedules.map(s => (
            <Card key={s.id} className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => { setEditing(s); setOpen(true); }}>
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-xl">{PLATFORM_ICONS[s.platform] || "📢"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.caption?.slice(0, 60) || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("tr-TR") : "—"}
                    {s.account_handle && ` · ${s.account_handle}`}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.publish_type === "auto" && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      <Zap className="w-2.5 h-2.5 mr-0.5" />Otomatik
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-xs ${STATUS_STYLES[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </Badge>
                </div>
                {s.status === "scheduled" && (
                  <Button size="sm" variant="outline" className="shrink-0"
                    onClick={(e) => { e.stopPropagation(); markPublished.mutate(s.id); }}>
                    <Check className="w-3 h-3 mr-1" /> Yayınlandı
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PublishScheduleDialog
        open={open}
        onOpenChange={setOpen}
        schedule={editing}
        companies={[company]}
        onMarkPublished={(id) => markPublished.mutate(id)}
      />
    </div>
  );
}