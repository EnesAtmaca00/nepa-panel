import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, CheckCircle2, History, ArrowDownUp, Send } from "lucide-react";
import { toast } from "sonner";
import PublishQueueCard from "@/components/publish/PublishQueueCard";
import QuickPublishDialog from "@/components/publish/QuickPublishDialog";

export default function PublishQueue() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending"); // pending | queue | history
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc | date_asc | company
  const [quickOpen, setQuickOpen] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    staleTime: Infinity,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["publish-schedules"],
    queryFn: () => base44.entities.PublishSchedule.filter({ deleted: false }, "-scheduled_at", 500),
  });

  const approve = useMutation({
    mutationFn: (id) => base44.entities.PublishSchedule.update(id, {
      approval_status: "approved", approved_at: new Date().toISOString(),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["publish-schedules"] }); toast.success("Onaylandı — sıraya alındı"); },
  });

  const reject = useMutation({
    mutationFn: (id) => base44.entities.PublishSchedule.update(id, {
      approval_status: "rejected", status: "cancelled",
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["publish-schedules"] }); toast.success("Reddedildi"); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.PublishSchedule.update(id, { deleted: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["publish-schedules"] }); toast.success("Silindi"); },
  });

  const runNow = useMutation({
    mutationFn: () => base44.functions.invoke("autoPostContent", {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules"] });
      const d = res.data || {};
      toast.success(`İşlendi: ${d.published || 0} yayınlandı, ${d.failed || 0} başarısız`);
    },
    onError: (e) => toast.error("Hata: " + e.message),
  });

  const filtered = useMemo(() => {
    let list = posts;
    if (companyFilter !== "all") list = list.filter(p => p.company_id === companyFilter);

    if (tab === "pending") {
      list = list.filter(p => p.approval_status === "pending_approval" && p.status === "scheduled");
    } else if (tab === "queue") {
      list = list.filter(p => p.status === "scheduled" && p.approval_status !== "pending_approval");
    } else {
      list = list.filter(p => ["published", "failed", "cancelled"].includes(p.status));
    }

    const sorted = [...list];
    if (sortBy === "date_desc") sorted.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    else if (sortBy === "date_asc") sorted.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    else sorted.sort((a, b) => (a.company_name || "").localeCompare(b.company_name || "", "tr"));
    return sorted;
  }, [posts, companyFilter, tab, sortBy]);

  const counts = useMemo(() => ({
    pending: posts.filter(p => p.approval_status === "pending_approval" && p.status === "scheduled").length,
    queue: posts.filter(p => p.status === "scheduled" && p.approval_status !== "pending_approval").length,
    history: posts.filter(p => ["published", "failed", "cancelled"].includes(p.status)).length,
  }), [posts]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Paylaşım Sırası & Geçmişi</h1>
          <p className="text-muted-foreground text-sm mt-1">Onay, sıra ve geçmişi yönetin · hızlı paylaşım yapın</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Button variant="outline" onClick={() => runNow.mutate()} disabled={runNow.isPending} className="gap-1.5 flex-1 sm:flex-none">
            <Send className="w-4 h-4" /> Sırayı Şimdi İşle
          </Button>
          <Button onClick={() => setQuickOpen(true)} className="gap-1.5 flex-1 sm:flex-none">
            <Zap className="w-4 h-4" /> Hızlı Paylaşım
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Müşteriler</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44 h-9"><ArrowDownUp className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Tarih (Yeni → Eski)</SelectItem>
            <SelectItem value="date_asc">Tarih (Eski → Yeni)</SelectItem>
            <SelectItem value="company">Şirkete Göre (A→Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sekmeler */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 sm:max-w-xl h-auto">
          <TabsTrigger value="pending" className="gap-1 sm:gap-1.5 px-1.5 sm:px-3 flex-wrap py-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" /> <span className="hidden xs:inline sm:inline">Onay </span>Bekleyen
            {counts.pending > 0 && <Badge className="ml-0.5 h-4 px-1.5 text-[10px] bg-orange-500">{counts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Sırada
            {counts.queue > 0 && <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">{counts.queue}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5">
            <History className="w-3.5 h-3.5 shrink-0" /> Geçmiş
            {counts.history > 0 && <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">{counts.history}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-card" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 flex flex-col items-center text-center gap-3 text-muted-foreground">
          {tab === "pending" ? <Clock className="w-10 h-10" /> : tab === "queue" ? <CheckCircle2 className="w-10 h-10" /> : <History className="w-10 h-10" />}
          <p className="font-medium">{tab === "pending" ? "Onay bekleyen paylaşım yok" : tab === "queue" ? "Sırada paylaşım yok" : "Geçmiş boş"}</p>
          {tab !== "history" && <Button size="sm" variant="outline" onClick={() => setQuickOpen(true)}><Zap className="w-3.5 h-3.5 mr-1" /> Hızlı Paylaşım Ekle</Button>}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <PublishQueueCard
              key={post.id}
              post={post}
              onApprove={(id) => approve.mutate(id)}
              onReject={(id) => reject.mutate(id)}
              onDelete={(id) => remove.mutate(id)}
            />
          ))}
        </div>
      )}

      <QuickPublishDialog open={quickOpen} onOpenChange={setQuickOpen} companies={companies} />
    </div>
  );
}