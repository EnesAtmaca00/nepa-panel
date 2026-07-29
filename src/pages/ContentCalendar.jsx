import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Wand2 } from "lucide-react";
import { formatDate, PLATFORM_LABELS, getStatusColor, getStatusLabel } from "@/lib/format";
import { toast } from "sonner";
import ContentIdeaDialog from "@/components/content/ContentIdeaDialog";
import AutoContentPlanDialog from "@/components/content/AutoContentPlanDialog";
import BulkPillarAssign from "@/components/content/BulkPillarAssign";
import PillarAssignButton from "@/components/content/PillarAssignButton";

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1; // Pazartesi=0
  const days = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function ContentCalendar() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date());
  const [companyFilter, setCompanyFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);

  const { data: ideas = [] } = useQuery({
    queryKey: ["all-ideas"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-scheduled_date", 1000),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
  });

  const days = useMemo(() => getMonthDays(date.getFullYear(), date.getMonth()), [date]);

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

  const updateDate = useMutation({
    mutationFn: ({ id, date }) => base44.entities.ContentIdea.update(id, { scheduled_date: date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-ideas"] });
      toast.success("Tarih güncellendi");
    },
  });

  const monthName = date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  const handleDrop = (e, day) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("idea-id");
    if (id && day) {
      const iso = day.toISOString().split("T")[0];
      updateDate.mutate({ id, date: iso });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">İçerik Takvimi</h1>
          <p className="text-muted-foreground text-sm mt-1">Tüm firmaların içerik planı</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPlanOpen(true)} className="gap-2">
            <Wand2 className="w-4 h-4" /> Otomatik Plan
          </Button>
          <Button onClick={() => { setEditing(null); setDefaultDate(null); setOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni İçerik
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Önceki ay" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold capitalize min-w-[200px] text-center">{monthName}</h2>
          <Button variant="outline" size="icon" aria-label="Sonraki ay" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>Bugün</Button>
        </div>

        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Firmalar</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Madde 1: Toplu pillar atama */}
      <BulkPillarAssign />

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-2" role="row">
            {[
              { abbr: "Pzt", full: "Pazartesi" },
              { abbr: "Sal", full: "Salı" },
              { abbr: "Çar", full: "Çarşamba" },
              { abbr: "Per", full: "Perşembe" },
              { abbr: "Cum", full: "Cuma" },
              { abbr: "Cmt", full: "Cumartesi" },
              { abbr: "Pzr", full: "Pazar" },
            ].map(d => (
              <div key={d.abbr} role="columnheader" className="text-xs text-muted-foreground text-center font-semibold py-1">
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
                  onDrop={(e) => handleDrop(e, day)}
                  aria-label={day ? day.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" }) : undefined}
                  {...(isToday ? { "aria-current": "date" } : {})}
                  className={`min-h-[100px] p-1.5 rounded-md border ${
                    !day ? "bg-muted/30 border-transparent" :
                    isToday ? "border-gold bg-gold/5" : "hover:bg-muted/30"
                  }`}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isToday ? "text-gold" : "text-muted-foreground"}`}>
                          {day.getDate()}
                        </span>
                        <button
                          onClick={() => { setEditing(null); setDefaultDate(iso); setOpen(true); }}
                          className="opacity-0 hover:opacity-100 text-[10px] text-muted-foreground"
                        >+</button>
                      </div>
                      <div className="space-y-1 mt-1">
                        {items.slice(0, 3).map(idea => (
                          <div
                            key={idea.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("idea-id", idea.id)}
                            onClick={() => { setEditing(idea); setOpen(true); }}
                            className="text-[10px] p-1 rounded bg-gold/10 hover:bg-gold/20 cursor-pointer truncate flex items-center gap-1"
                            title={idea.title}
                          >
                            <span className="flex-1 truncate">{idea.title}</span>
                            {!idea.content_pillar && (
                              <PillarAssignButton ideaId={idea.id} />
                            )}
                          </div>
                        ))}
                        {items.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div>
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

      <ContentIdeaDialog
        open={open}
        onOpenChange={setOpen}
        idea={editing}
        defaultDate={defaultDate}
        companies={companies}
      />

      <AutoContentPlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        companies={companies}
      />
    </div>
  );
}