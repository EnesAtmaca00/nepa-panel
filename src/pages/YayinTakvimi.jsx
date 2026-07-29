import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Check, Calendar, List, AlertTriangle, Lightbulb, Zap, GripVertical } from "lucide-react";
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

const PLATFORM_BG = {
  instagram_post: "#fce7f3", instagram_reels: "#fdf4ff", instagram_story: "#fff7ed",
  tiktok: "#f0fdf4", youtube: "#fef2f2", linkedin: "#eff6ff", facebook: "#eff6ff",
  twitter: "#e0f2fe", other: "#f8fafc",
};

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

// Aynı gün 2+ paylaşım çakışma uyarısı
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

export default function YayinTakvimi() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("monthly");
  const [date, setDate] = useState(new Date());
  const [companyFilter, setCompanyFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dragging, setDragging] = useState(null); // { id, originalDate }
  const [dragOver, setDragOver] = useState(null); // iso date string
  const [ideasOpen, setIdeasOpen] = useState(false);

  // URL'den prefill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("prefill");
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill));
        setEditing(data);
        setOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {}
    }
  }, []);

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

  const { data: contentIdeas = [] } = useQuery({
    queryKey: ["content-ideas-unscheduled"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 100),
    staleTime: 30_000,
  });

  const markPublished = useMutation({
    mutationFn: (id) => base44.entities.PublishSchedule.update(id, {
      status: "published", published_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules"] });
      toast.success("Yayınlandı olarak işaretlendi");
    },
  });

  const reschedule = useMutation({
    mutationFn: ({ id, newDate }) => {
      const existing = schedules.find(s => s.id === id);
      const time = existing?.scheduled_at?.slice(11, 19) || "10:00:00";
      return base44.entities.PublishSchedule.update(id, {
        scheduled_at: `${newDate}T${time}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publish-schedules"] });
      toast.success("Tarih güncellendi");
    },
  });

  const createFromIdea = useMutation({
    mutationFn: ({ idea, targetDate }) => {
      const company = companies.find(c => c.id === idea.company_id);
      return base44.entities.PublishSchedule.create({
        company_id: idea.company_id,
        company_name: company?.name || idea.company_name,
        content_idea_id: idea.id,
        platform: idea.platform?.toLowerCase().includes("reels") ? "instagram_reels" :
                  idea.platform?.toLowerCase().includes("story") ? "instagram_story" :
                  idea.platform?.toLowerCase().includes("tiktok") ? "tiktok" :
                  idea.platform?.toLowerCase().includes("linkedin") ? "linkedin" :
                  "instagram_post",
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
      setIdeasOpen(false);
    },
  });

  const filtered = useMemo(() => schedules.filter(s => {
    if (companyFilter !== "all" && s.company_id !== companyFilter) return false;
    if (platformFilter !== "all" && s.platform !== platformFilter) return false;
    return true;
  }), [schedules, companyFilter, platformFilter]);

  const conflicts = useMemo(() => detectConflicts(filtered), [filtered]);

  const days = useMemo(() => getMonthDays(date.getFullYear(), date.getMonth()), [date]);
  const weekDays = useMemo(() => getWeekDays(date), [date]);

  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const day = s.scheduled_at?.split("T")[0];
      if (!day) return;
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [filtered]);

  const monthName = date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  // Drag handlers
  const handleDragStart = (e, schedule) => {
    setDragging(schedule);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDayDragOver = (e, iso) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(iso);
  };

  const handleDayDrop = (e, iso) => {
    e.preventDefault();
    if (dragging && iso && iso !== dragging.scheduled_at?.split("T")[0]) {
      reschedule.mutate({ id: dragging.id, newDate: iso });
    }
    setDragging(null);
    setDragOver(null);
  };

  // İçerik fikri sürükleme
  const handleIdeaDrop = (e, iso) => {
    e.preventDefault();
    const ideaId = e.dataTransfer.getData("idea_id");
    if (!ideaId) return;
    const idea = contentIdeas.find(i => i.id === ideaId);
    if (idea) createFromIdea.mutate({ idea, targetDate: iso });
    setDragOver(null);
  };

  const handleCombinedDrop = (e, iso) => {
    if (e.dataTransfer.getData("idea_id")) handleIdeaDrop(e, iso);
    else handleDayDrop(e, iso);
  };

  const unscheduledIdeas = contentIdeas.filter(i =>
    i.work_status !== "published" && !schedules.some(s => s.content_idea_id === i.id)
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Ana Takvim */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Yayın Takvimi</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Sürükle-bırak ile yayın planı yönetimi</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIdeasOpen(!ideasOpen)} className="gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              İçerik Fikirleri
              {unscheduledIdeas.length > 0 && (
                <Badge className="ml-0.5 h-4 px-1 text-[10px] bg-amber-500">{unscheduledIdeas.length}</Badge>
              )}
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Yeni Plan
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 border rounded-md p-1">
            <Button variant={view === "monthly" ? "default" : "ghost"} size="sm" onClick={() => setView("monthly")}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> Aylık
            </Button>
            <Button variant={view === "weekly" ? "default" : "ghost"} size="sm" onClick={() => setView("weekly")}>
              <List className="w-3.5 h-3.5 mr-1" /> Haftalık
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(date);
              view === "weekly" ? d.setDate(d.getDate() - 7) : d.setMonth(d.getMonth() - 1);
              setDate(d);
            }}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-medium min-w-[150px] text-center capitalize">{monthName}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => {
              const d = new Date(date);
              view === "weekly" ? d.setDate(d.getDate() + 7) : d.setMonth(d.getMonth() + 1);
              setDate(d);
            }}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>Bugün</Button>
          </div>

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Tüm Firmalar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Firmalar</SelectItem>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Tüm Platformlar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Platformlar</SelectItem>
              {Object.entries(PLATFORM_ICONS).map(([k, icon]) => (
                <SelectItem key={k} value={k}>{icon} {k.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Çakışma Uyarısı */}
        {conflicts.size > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{conflicts.size} paylaşımda aynı günde çakışma var. Sürükleyerek farklı güne taşıyabilirsiniz.</span>
          </div>
        )}

        {/* Monthly View */}
        {view === "monthly" && (
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
                  const items = iso ? (byDay[iso] || []) : [];
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
                      onDragOver={day ? (e) => handleDayDragOver(e, iso) : undefined}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={day ? (e) => handleCombinedDrop(e, iso) : undefined}
                    >
                      {day && (
                        <>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[11px] font-semibold ${isToday ? "text-accent" : "text-muted-foreground"}`}>
                              {day.getDate()}
                            </span>
                            <button
                              className="text-[10px] text-muted-foreground opacity-0 hover:opacity-100"
                              onClick={() => {
                                setEditing({ scheduled_at: iso + "T10:00:00" });
                                setOpen(true);
                              }}
                            >+</button>
                          </div>
                          <div className="space-y-0.5">
                            {items.slice(0, 3).map(s => (
                              <div
                                key={s.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, s)}
                                onClick={() => { setEditing(s); setOpen(true); }}
                                className={`text-[10px] p-1 rounded cursor-grab active:cursor-grabbing truncate flex items-center gap-0.5 hover:opacity-80 relative ${conflicts.has(s.id) ? "ring-1 ring-amber-400" : ""}`}
                                style={{ backgroundColor: PLATFORM_BG[s.platform] || "#f8fafc" }}
                                title={s.caption || s.company_name}
                              >
                                {conflicts.has(s.id) && <AlertTriangle className="w-2 h-2 text-amber-500 shrink-0" />}
                                <span className="shrink-0">{PLATFORM_ICONS[s.platform] || "📢"}</span>
                                <span className="truncate">{s.company_name}</span>
                                {s.publish_type === "auto" && <Zap className="w-2 h-2 text-amber-500 shrink-0" />}
                              </div>
                            ))}
                            {items.length > 3 && (
                              <div className="text-[10px] text-muted-foreground pl-1">+{items.length - 3}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly View */}
        {view === "weekly" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const iso = day.toISOString().split("T")[0];
              const items = byDay[iso] || [];
              const isToday = day.toDateString() === new Date().toDateString();
              const isDragTarget = dragOver === iso;
              return (
                <div
                  key={iso}
                  className={`rounded-lg border p-2 min-h-[240px] transition-colors ${
                    isDragTarget ? "border-accent bg-accent/10 border-dashed" :
                    isToday ? "border-accent bg-accent/5" : "border-border/50"
                  }`}
                  onDragOver={(e) => handleDayDragOver(e, iso)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleCombinedDrop(e, iso)}
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
                        onDragStart={(e) => handleDragStart(e, s)}
                        onClick={() => { setEditing(s); setOpen(true); }}
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
                          <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[s.status]}`}>
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
                            onClick={(e) => { e.stopPropagation(); markPublished.mutate(s.id); }}>
                            <Check className="w-2.5 h-2.5 mr-0.5" /> Yayınlandı
                          </Button>
                        )}
                      </div>
                    ))}
                    <div
                      className="border-2 border-dashed border-muted/40 rounded p-1 text-center text-[10px] text-muted-foreground/50 cursor-pointer hover:border-muted hover:text-muted-foreground"
                      onClick={() => { setEditing({ scheduled_at: iso + "T10:00:00" }); setOpen(true); }}
                    >+ ekle</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* İçerik Fikirleri Panel */}
      {ideasOpen && (
        <div className="w-64 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              İçerik Fikirleri
            </h3>
            <button className="text-muted-foreground text-xs hover:text-foreground" onClick={() => setIdeasOpen(false)}>✕</button>
          </div>
          <p className="text-xs text-muted-foreground">Sürükleyip takvim günlerine bırakın</p>
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {unscheduledIdeas.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Planlanmamış fikir yok</p>
            ) : (
              unscheduledIdeas.map(idea => (
                <div
                  key={idea.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("idea_id", idea.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="p-2 rounded-lg border bg-card cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-accent/50 transition-all"
                >
                  <div className="flex items-start gap-1.5 mb-1">
                    <GripVertical className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium leading-tight line-clamp-2">{idea.title}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap pl-4">
                    {idea.company_name && (
                      <Badge variant="outline" className="text-[10px] h-4">{idea.company_name}</Badge>
                    )}
                    {idea.platform && (
                      <Badge variant="secondary" className="text-[10px] h-4">{idea.platform}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <PublishScheduleDialog
        open={open}
        onOpenChange={setOpen}
        schedule={editing}
        companies={companies}
        onMarkPublished={(id) => markPublished.mutate(id)}
      />
    </div>
  );
}