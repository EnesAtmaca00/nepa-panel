import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Check, Trash2, RefreshCw, AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

const SEVERITY_ICON = {
  info: { icon: Info, color: "text-blue-500" },
  success: { icon: CheckCircle, color: "text-emerald-500" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  critical: { icon: AlertCircle, color: "text-destructive" },
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("unread");
  const [running, setRunning] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => {
      const q = filter === "unread" ? { read: false } : filter === "read" ? { read: true } : {};
      return base44.entities.Notification.filter(q, "-created_date", 200);
    },
    initialData: [],
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true, dismissed_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = await base44.entities.Notification.filter({ read: false }, "-created_date", 500);
      for (const n of unread) {
        await base44.entities.Notification.update(n.id, { read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Tümü okundu olarak işaretlendi");
    },
  });

  const removeNotif = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const runChecks = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("runDailyChecks", {});
      const data = res.data || {};
      const total = (data.created?.invoices || 0) + (data.created?.recurring || 0) + (data.created?.special || 0) + (data.created?.contracts || 0);
      toast.success(`${total} bildirim oluşturuldu`);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error("Hata: " + (e.message || ""));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bildirimler</h1>
          <p className="text-muted-foreground text-sm mt-1">{notifications.length} bildirim</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runChecks} disabled={running}>
            <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} /> Kontrolü Çalıştır
          </Button>
          <Button variant="outline" onClick={() => markAllRead.mutate()}>
            <Check className="w-4 h-4 mr-2" /> Tümünü Okundu Yap
          </Button>
        </div>
      </div>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="unread">Okunmamış</SelectItem>
          <SelectItem value="read">Okunmuş</SelectItem>
          <SelectItem value="all">Hepsi</SelectItem>
        </SelectContent>
      </Select>

      {notifications.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">{filter === "unread" ? "🎉 Tüm bildirimler okundu!" : "Bildirim yok."}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const sev = SEVERITY_ICON[n.severity] || SEVERITY_ICON.info;
            const SevIcon = sev.icon;
            return (
              <Card key={n.id} className={!n.read ? "border-l-4 border-l-gold" : ""}>
                <CardContent className="p-4 flex items-start gap-3">
                  <SevIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${sev.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{n.title}</h3>
                      {!n.read && <Badge variant="outline" className="text-[10px]">Yeni</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n.created_date)}</p>
                    {n.company_id && (
                      <Link to={`/musteriler/${n.company_id}`} className="text-xs text-gold hover:underline mt-1 inline-block">
                        Müşteriye git →
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!n.read && (
                      <Button size="icon" variant="ghost" aria-label="Bildirimi okundu işaretle" onClick={() => markRead.mutate(n.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" aria-label="Bildirimi sil" onClick={() => removeNotif.mutate(n.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}