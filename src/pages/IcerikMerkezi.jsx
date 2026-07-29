import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Plus, Wand2, Calendar, List,
  AlertTriangle, Lightbulb, Zap, GripVertical, Check
} from "lucide-react";
import { toast } from "sonner";
import ContentIdeaDialog from "@/components/content/ContentIdeaDialog";
import AutoContentPlanDialog from "@/components/content/AutoContentPlanDialog";
import BulkPillarAssign from "@/components/content/BulkPillarAssign";
import PillarAssignButton from "@/components/content/PillarAssignButton";
import PublishScheduleDialog from "@/components/publish/PublishScheduleDialog";

// ─── helpers ────────────────────────────────────────────────────────────────
function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function getWeekDays(date) {
  const start = new Date(date);
  const dow = start.getDay() === 0 ? 6 : start.getDay() - 1;
  start.setDate(start.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function detectConflicts(schedules) {
  const map = {};
  schedules.forEach(s => {
    const day = s.scheduled_at?.split("T")[0];
    if (!day || s.status === "cancelled" || s.deleted) return;
    const key = `${s.company_id}_${day}`;
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  const conflicts = new Set();
  Object.values(map).forEach(group => {
    if (group.length >= 2) group.forEach(s => conflicts.add(s.id));
  });
  return conflicts;
}

const PLATFORM_ICONS = {
  instagram_post: "📸", instagram_reels: "🎬", instagram_story: "⭕",
  tiktok: "🎵", youtube: "▶️", linkedin: "💼", facebook: "👤", twitter: "🐦", other: "📢",
};

const PLATFORM_BG = {
  instagram_post: "#fce7f3", instagram_reels: "#fdf4ff", instagram_story: "#fff7ed",
  tiktok: "#f0fdf4", youtube: "#fef2f2", linkedin: "#eff6ff", facebook: "#eff6ff",
  twitter: "#e0f2fe", other: "#f8fafc",
};

const STATUS_STYLES = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
};

// ─── main component ──────────────────────────────────────────────────────────
export default function IcerikMerkezi() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("ideas");

  const [date, setDate] = useState(new Date());
  const [companyFilter, setCompanyFilter] = useState("all");

  // ideas tab
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);

  // publish tab
  const [publishView, setPublishView] = useState("monthly");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [publishOpen, setPublishOpen] = useState(false);
  const [editingPublish, setEditingPublish] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [ideasPanelOpen, setIdeasPanelOpen] = useState(false);

  // URL prefill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("prefill");
    const gotoTab = params.get("tab");
    if (gotoTab === "publish") setTab("publish");
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill));
        setEditingPublish(data);
        setPublishOpen(true);
        setTab("publish");
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {}
    }
  }, []);

  // ── queries ──
  const { data: ideas = [] } = useQuery({
    queryKey: ["all-ideas"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-scheduled_date", 1000),
    staleTime: 30_000,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["publish-schedules"],
    queryFn: () => base44.entities.PublishSchedule.filter({ deleted: false }, "-scheduled_at", 500),
    staleTime: 30_000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    staleTime: Infinity,
  });

  // ── mutations ──
  const updateIdeaDate = useMutation({
    mutationFn: ({ id, date: d }) => base44.entities.ContentIdea.update(id, { scheduled_date: d }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-ideas"] }); toast.success("Tarih güncellendi"); },
  });

  const markPublished = useMutation({
    mutationFn: (id) => base44.entities.PublishSchedule.update(id, { status: "published", published_at: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["publish-schedules"] }); toast.success("Yayınlandı olarak işaretlendi"); },
  });

  const reschedule = useMutation({
    mutationFn: ({ id, newDate }) => {
      const existing = schedules.find(s => s.id === id);
      const time = existing?.scheduled_at?.slice(11, 19) || "10:00:00";
      return base44.entities.PublishSchedule.update(id, { scheduled_at: `${newDate}T${time}` });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["publish-schedules"] }); toast.success("Tarih güncellendi"); },
  });

  const createFromIdea = useMutation({
    mutationFn: ({ idea, targetDate }) => {
      const company = companies.find(c => c.id === idea.company_id);
      const platform = idea.platform?.toLowerCase().includes("reels") ? "instagram_reels"
        : idea.platform?.toLowerCase().includes("story") ? "instagram_story"
        : idea.platform?.toLowerCase().includes("tiktok") ? "tiktok"
        : idea.platform?.toLowerCase().includes("linkedin") ? "linkedin"
        : "instagram_post";
      return base44.entities.PublishSchedule.create({
        company_id: idea.company_id,
        company_name: company?.name || idea.company_name,
        content_idea_id: idea.id,
        platform,
        caption: idea.caption || idea.topic || "",
        hashtags: idea.hashtags || [],
        scheduled_at: `${targetDate}T10:00:00`,
        status: "scheduled",
        publish_type: "manual",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules"] });
      toast.success("İçerik takvime eklendi");
      setIdeasPanelOpen(false);
    },
  });

  // ── computed ──
  const days = useMemo(() => getMonthDays(date.getFullYear(), date.getMonth()), [date]);
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const monthName = date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  const ideaByDay = useMemo(() => {
    const map = {};
    const filtered = companyFilter === "all" ? ideas : ideas.filter(i => i.company_id === companyFilter);
    filtered.forEach(i => {
      if (!i.scheduled_date) return;
      if (!map[i.scheduled_date]) map[i.scheduled_date] = [];
      map[i.scheduled_date].push(i);
    });
    return map;
  }, [ideas, companyFilter]);

  const filteredSchedules = useMemo(() => schedules.filter(s => {
    if (companyFilter !== "all" && s.company_id !== companyFilter) return false;
    if (platformFilter !== "all" && s.platform !== platformFilter) return false;
    return true;
  }), [schedules, companyFilter, platformFilter]);

  const conflicts = useMemo(() => detectConflicts(filteredSchedules), [filteredSchedules]);

  const scheduleByDay = useMemo(() => {
    const map = {};
    filteredSchedules.forEach(s => {
      const day = s.scheduled_at?.split("T")[0];
      if (!day) return;
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [filteredSchedules]);

  const unscheduledIdeas = useMemo(() =>
    ideas.filter(i => i.work_status !== "published" && !schedules.some(s => s.content_idea_id === i.id)),
    [ideas, schedules]
  );

  // ── handlers ──
  const handleIdeaDrop = (e, day) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("idea-id");
    if (id && day) updateIdeaDate.mutate({ id, date: day.toISOString().split("T")[0] });
  };

  const handlePublishDragStart = (e, schedule) => { setDragging(schedule); e.dataTransfer.effectAllowed = "move"; };
  const handlePublishDayDragOver = (e, iso) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(iso); };
  const handlePublishDayDrop = (e, iso) => {
    e.preventDefault();
    const ideaId = e.dataTransfer.getData("idea_id");
    if (ideaId) {
      const idea = unscheduledIdeas.find(i => i.id === ideaId);
      if (idea) createFromIdea.mutate({ idea, targetDate: iso });
    } else if (dragging && iso && iso !== dragging.scheduled_at?.split("T")[0]) {
      reschedule.mutate({ id: dragging.id, newDate: iso });
    }
    setDragging(null);
    setDragOver(null);
  };

  const prevPeriod = () => {
    const d = new Date(date);
    if (tab === "ideas" || publishView === "monthly") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setDate(d);
  };
  const nextPeriod = () => {
    const d = new Date(date);
    if (tab === "ideas" || publishView === "monthly") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setDate(d);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">İçerik Merkezi</h1>
          <p className="text-muted-foreground text-sm mt-0.5">İçerik geliştirme ve yayın takvimi</p>
        </div>
        <div className="flex gap-2">
          {tab === "ideas" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPlanOpen(true)} className="gap-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Otomatik Plan
              </Button>
              <Button size="sm" onClick={() => { setEditingIdea(null); setDefaultDate(null); setIdeaOpen(true); }} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Yeni İçerik
              </Button>
            </>
          )}
          {tab === "publish" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIdeasPanelOpen(v => !v)} className="gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Fikir Havuzu
                {unscheduledIdeas.length > 0 && (
                  <Badge className="ml-0.5 h-4 px-1 text-[10px] bg-amber-500">{unscheduledIdeas.length}</Badge>
                )}
              </Button>
              <Button size="sm" onClick={() => { setEditingPublish(null); setPublishOpen(true); }} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Yeni Yayın
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs + toolbar */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList>
            <TabsTrigger value="ideas">📝 İçerik Geliştirme</TabsTrigger>
            <TabsTrigger value="publish">📅 Yayın Takvimi</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevPeriod}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium min-w-[160px] text-center capitalize">{monthName}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextPeriod}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>Bugün</Button>
          </div>

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Tüm Firmalar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Firmalar</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {tab === "publish" && (
            <>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Tüm Platformlar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Platformlar</SelectItem>
                  {Object.entries(PLATFORM_ICONS).map(([k, icon]) => (
                    <SelectItem key={k} value={k}>{icon} {k.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 border rounded-md p-0.5">
                <Button variant={publishView === "monthly" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setPublishView("monthly")}>
                  <Calendar className="w-3 h-3 mr-1" /> Aylık
                </Button>
                <Button variant={publishView === "weekly" ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setPublishView("weekly")}>
                  <List className="w-3 h-3 mr-1" /> Haftalık
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ── İçerik Geliştirme ── */}
        <TabsContent value="ideas" className="mt-4 space-y-4">
          <BulkPillarAssign />
          <IdeasCalendar
            days={days}
            ideaByDay={ideaByDay}
            onDrop={handleIdeaDrop}
            onAdd={(iso) => { setEditingIdea(null); setDefaultDate(iso); setIdeaOpen(true); }}
            onEdit={(idea) => { setEditingIdea(idea); setIdeaOpen(true); }}
          />
        </TabsContent>

        {/* ── Yayın Takvimi ── */}
        <TabsContent value="publish" className="mt-4">
          <div className="flex gap-4">
            <div className="flex-1 min-w-0 space-y-4">
              {conflicts.size > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{conflicts.size} paylaşımda aynı günde çakışma var.</span>
                </div>
              )}
              {publishView === "monthly" && (
                <PublishMonthlyView
                  days={days}
                  scheduleByDay={scheduleByDay}
                  conflicts={conflicts}
                  dragOver={dragOver}
                  onDragStart={handlePublishDragStart}
                  onDragOver={handlePublishDayDragOver}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={handlePublishDayDrop}
                  onAdd={(iso) => { setEditingPublish({ scheduled_at: iso + "T10:00:00" }); setPublishOpen(true); }}
                  onEdit={(s) => { setEditingPublish(s); setPublishOpen(true); }}
                />
              )}
              {publishView === "weekly" && (
                <PublishWeeklyView
                  weekDays={weekDays}
                  scheduleByDay={scheduleByDay}
                  conflicts={conflicts}
                  dragOver={dragOver}
                  onDragStart={handlePublishDragStart}
                  onDragOver={handlePublishDayDragOver}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={handlePublishDayDrop}
                  onAdd={(iso) => { setEditingPublish({ scheduled_at: iso + "T10:00:00" }); setPublishOpen(true); }}
                  onEdit={(s) => { setEditingPublish(s); setPublishOpen(true); }}
                  onMarkPublished={(id) => markPublished.mutate(id)}
                />
              )}
            </div>

            {ideasPanelOpen && (
              <div className="w-60 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" /> Fikir Havuzu
                  </h3>
                  <button className="text-muted-foreground text-xs hover:text-foreground" onClick={() => setIdeasPanelOpen(false)}>✕</button>
                </div>
                <p className="text-xs text-muted-foreground">Sürükleyip takvim günlerine bırakın</p>
                <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
                  {unscheduledIdeas.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Planlanmamış fikir yok</p>
                  ) : unscheduledIdeas.map(idea => (
                    <div
                      key={idea.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("idea_id", idea.id); e.dataTransfer.effectAllowed = "copy"; }}
                      className="p-2 rounded-lg border bg-card cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-accent/50 transition-all"
                    >
                      <div className="flex items-start gap-1.5 mb-1">
                        <GripVertical className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium leading-tight line-clamp-2">{idea.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 pl-4">
                        {idea.company_name && <Badge variant="outline" className="text-[10px] h-4">{idea.company_name}</Badge>}
                        {idea.platform && <Badge variant="secondary" className="text-[10px] h-4">{idea.platform}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ContentIdeaDialog
        open={ideaOpen}
        onOpenChange={setIdeaOpen}
        idea={editingIdea}
        defaultDate={defaultDate}
        companies={companies}
      />
      <AutoContentPlanDialog open={planOpen} onOpenChange={setPlanOpen} companies={companies} />
      <PublishScheduleDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        schedule={editingPublish}
        companies={companies}
        onMarkPublished={(id) => markPublished.mutate(id)}
      />
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function IdeasCalendar({ days, ideaByDay, onDrop, onAdd, onEdit }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[
            { abbr: "Pzt", full: "Pazartesi" }, { abbr: "Sal", full: "Salı" },
            { abbr: "Çar", full: "Çarşamba" }, { abbr: "Per", full: "Perşembe" },
            { abbr: "Cum", full: "Cuma" }, { abbr: "Cmt", full: "Cumartesi" },
            { abbr: "Pzr", full: "Pazar" },
          ].map(d => (
            <div key={d.abbr} className="text-xs text-muted-foreground text-center font-semibold py-1">
              <abbr title={d.full} style={{ textDecoration: "none" }}>{d.abbr}</abbr>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const iso = day?.toISOString().split("T")[0];
            const items = iso ? (ideaByDay[iso] || []) : [];
            const isToday = day && day.toDateString() === new Date().toDateString();
            return (
              <div
                key={idx}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => day && onDrop(e, day)}
                className={`min-h-[100px] p-1.5 rounded-md border ${
                  !day ? "bg-muted/30 border-transparent" :
                  isToday ? "border-gold bg-gold/5" : "hover:bg-muted/30"
                }`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isToday ? "text-gold" : "text-muted-foreground"}`}>{day.getDate()}</span>
                      <button onClick={() => onAdd(iso)} className="opacity-0 hover:opacity-100 text-[10px] text-muted-foreground">+</button>
                    </div>
                    <div className="space-y-1 mt-1">
                      {items.slice(0, 3).map(idea => (
                        <div
                          key={idea.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("idea-id", idea.id)}
                          onClick={() => onEdit(idea)}
                          className="text-[10px] p-1 rounded bg-gold/10 hover:bg-gold/20 cursor-pointer truncate flex items-center gap-1"
                          title={idea.title}
                        >
                          <span className="flex-1 truncate">{idea.title}</span>
                          {!idea.content_pillar && <PillarAssignButton ideaId={idea.id} />}
                        </div>
                      ))}
                      {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PublishMonthlyView({ days, scheduleByDay, conflicts, dragOver, onDragStart, onDragOver, onDragLeave, onDrop, onAdd, onEdit }) {
  return (
    <Card>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 gap-px mb-1">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Pzr"].map(d => (
            <div key={d} className="text-[11px] text-muted-foreground text-center font-semibold py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {days.map((day, idx) => {
            const iso = day?.toISOString().split("T")[0];
            const items = iso ? (scheduleByDay[iso] || []) : [];
            const isToday = day && day.toDateString() === new Date().toDateString();
            const isDragTarget = dragOver === iso;
            return (
              <div
                key={idx}
                className={`min-h-[100px] p-1 rounded border transition-colors ${
                  !day ? "bg-muted/20 border-transparent" :
                  isDragTarget ? "border-accent bg-accent/10 border-dashed" :
                  isToday ? "border-accent bg-accent/5" :
                  "border-border/50 hover:bg-muted/20"
                }`}
                onDragOver={day ? (e) => onDragOver(e, iso) : undefined}
                onDragLeave={onDragLeave}
                onDrop={day ? (e) => onDrop(e, iso) : undefined}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[11px] font-semibold ${isToday ? "text-accent" : "text-muted-foreground"}`}>{day.getDate()}</span>
                      <button className="text-[10px] text-muted-foreground opacity-0 hover:opacity-100" onClick={() => onAdd(iso)}>+</button>
                    </div>
                    <div className="space-y-0.5">
                      {items.slice(0, 3).map(s => (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, s)}
                          onClick={() => onEdit(s)}
                          className={`text-[10px] p-1 rounded cursor-grab active:cursor-grabbing truncate flex items-center gap-0.5 hover:opacity-80 ${conflicts.has(s.id) ? "ring-1 ring-amber-400" : ""}`}
                          style={{ backgroundColor: PLATFORM_BG[s.platform] || "#f8fafc" }}
                          title={s.caption || s.company_name}
                        >
                          {conflicts.has(s.id) && <AlertTriangle className="w-2 h-2 text-amber-500 shrink-0" />}
                          <span className="shrink-0">{PLATFORM_ICONS[s.platform] || "📢"}</span>
                          <span className="truncate">{s.company_name}</span>
                          {s.publish_type === "auto" && <Zap className="w-2 h-2 text-amber-500 shrink-0" />}
                        </div>
                      ))}
                      {items.length > 3 && <div className="text-[10px] text-muted-foreground pl-1">+{items.length - 3}</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PublishWeeklyView({ weekDays, scheduleByDay, conflicts, dragOver, onDragStart, onDragOver, onDragLeave, onDrop, onAdd, onEdit, onMarkPublished }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day) => {
        const iso = day.toISOString().split("T")[0];
        const items = scheduleByDay[iso] || [];
        const isToday = day.toDateString() === new Date().toDateString();
        const isDragTarget = dragOver === iso;
        return (
          <div
            key={iso}
            className={`rounded-lg border p-2 min-h-[240px] transition-colors ${
              isDragTarget ? "border-accent bg-accent/10 border-dashed" :
              isToday ? "border-accent bg-accent/5" : "border-border/50"
            }`}
            onDragOver={(e) => onDragOver(e, iso)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, iso)}
          >
            <div className={`text-xs font-semibold mb-2 flex items-center justify-between ${isToday ? "text-accent" : "text-muted-foreground"}`}>
              <span>{day.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" })}</span>
              {items.length > 0 && <span className="text-[10px]">{items.length}</span>}
            </div>
            <div className="space-y-1.5">
              {items.map(s => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, s)}
                  onClick={() => onEdit(s)}
                  className={`p-1.5 rounded border text-xs cursor-grab active:cursor-grabbing hover:bg-muted/50 space-y-1 ${conflicts.has(s.id) ? "border-amber-300 bg-amber-50" : ""}`}
                >
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                    <span>{PLATFORM_ICONS[s.platform]}</span>
                    <span className="font-medium truncate flex-1">{s.company_name}</span>
                    {s.publish_type === "auto" && <Zap className="w-3 h-3 text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-muted-foreground">{s.scheduled_at?.slice(11, 16)}</span>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[s.status] || ""}`}>
                      {s.status === "scheduled" ? "Planlandı" : s.status === "published" ? "✓" : s.status}
                    </Badge>
                  </div>
                  {conflicts.has(s.id) && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span className="text-[10px]">Çakışma</span>
                    </div>
                  )}
                  {s.status === "scheduled" && (
                    <Button size="sm" variant="outline" className="w-full h-5 text-[10px]"
                      onClick={(e) => { e.stopPropagation(); onMarkPublished(s.id); }}>
                      <Check className="w-2.5 h-2.5 mr-0.5" /> Yayınlandı
                    </Button>
                  )}
                </div>
              ))}
              <div
                className="border-2 border-dashed border-muted/40 rounded p-1 text-center text-[10px] text-muted-foreground/50 cursor-pointer hover:border-muted hover:text-muted-foreground"
                onClick={() => onAdd(iso)}
              >+ ekle</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}