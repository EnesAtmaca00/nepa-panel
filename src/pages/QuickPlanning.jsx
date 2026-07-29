import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Zap, Plus, Trash2, CheckSquare, Square, ChevronDown, ChevronRight, CalendarDays } from "lucide-react";
import { todayISO, diffDays, formatDate } from "@/lib/format";
import { toast } from "sonner";

function computeOccurrence(day, year) {
  const y = year || new Date().getFullYear();
  if (day.date_rule_type === "fixed" && day.fixed_date) return `${y}-${day.fixed_date}`;
  if (day.date_rule_type === "dynamic" && day.dynamic_rule) {
    function nthDay(month, weekday, n) {
      const d = new Date(y, month - 1, 1);
      let count = 0;
      while (d.getMonth() === month - 1) {
        if (d.getDay() === weekday) { count++; if (count === n) return d.toISOString().split("T")[0]; }
        d.setDate(d.getDate() + 1);
      }
      return null;
    }
    function lastDay(month, weekday) {
      const d = new Date(y, month, 0);
      while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    }
    switch (day.dynamic_rule) {
      case "anneler_gunu": return nthDay(5, 0, 2);
      case "babalar_gunu": return nthDay(6, 0, 3);
      case "black_friday": return lastDay(11, 5);
      default: return null;
    }
  }
  return null;
}

export default function QuickPlanning() {
  const queryClient = useQueryClient();
  const today = todayISO();

  // Seçimler: { key: boolean } — key = "template_id::company_id" veya "special_id::company_id" vs.
  const [selected, setSelected] = useState({});
  // Manuel satırlar: [{company_id, company_name, content_type}]
  const [manualRows, setManualRows] = useState([]);
  const [manualForm, setManualForm] = useState({ company_id: "", content_type: "" });
  // Accordion açık/kapalı
  const [openSections, setOpenSections] = useState({});

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false, status: "active" }, "name", 200),
    initialData: [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["recurring-templates"],
    queryFn: () => base44.entities.RecurringContentTemplate.filter({ active: true }, "name", 100),
    initialData: [],
  });

  const { data: specialDays = [] } = useQuery({
    queryKey: ["special-days"],
    queryFn: () => base44.entities.SpecialDay.list("name", 500),
    initialData: [],
  });

  const { data: todayTasks = [] } = useQuery({
    queryKey: ["tasks-today"],
    queryFn: () => base44.entities.Task.filter({ due_date: today, deleted: false }, "status", 100),
  });

  // Bugün veya yakın özel günler (7 gün içinde)
  const nearSpecialDays = useMemo(() => {
    return specialDays
      .map(d => {
        const thisYear = computeOccurrence(d, new Date().getFullYear());
        const next = thisYear && thisYear >= today ? thisYear : computeOccurrence(d, new Date().getFullYear() + 1);
        return { ...d, next_date: next };
      })
      .filter(d => d.next_date && diffDays(d.next_date) >= 0 && diffDays(d.next_date) <= 7)
      .sort((a, b) => a.next_date.localeCompare(b.next_date));
  }, [specialDays, today]);

  const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  const toggleItem = (key) => setSelected(s => ({ ...s, [key]: !s[key] }));

  const addManualRow = () => {
    if (!manualForm.company_id || !manualForm.content_type) {
      toast.error("Müşteri ve içerik tipi seçin");
      return;
    }
    const co = companies.find(c => c.id === manualForm.company_id);
    setManualRows(r => [...r, { ...manualForm, company_name: co?.name || "", id: Date.now().toString() }]);
    setManualForm({ company_id: "", content_type: "" });
  };

  const createPlan = useMutation({
    mutationFn: async () => {
      const tasks = [];

      // Tekrarlayan şablonlardan
      templates.forEach(tmpl => {
        const subscribedCompanyIds = tmpl.subscribed_companies || [];
        subscribedCompanyIds.forEach(cid => {
          const key = `tmpl_${tmpl.id}_${cid}`;
          if (selected[key]) {
            const co = companies.find(c => c.id === cid);
            tasks.push({
              title: `${tmpl.name} - ${co?.name || cid}`,
              due_date: today,
              status: "todo",
              company_id: cid,
            });
          }
        });
      });

      // Özel günlerden
      nearSpecialDays.forEach(day => {
        companies.forEach(co => {
          const key = `special_${day.id}_${co.id}`;
          if (selected[key]) {
            tasks.push({
              title: `${day.emoji || "📅"} ${day.name} - ${co.name}`,
              due_date: today,
              status: "todo",
              company_id: co.id,
            });
          }
        });
      });

      // Manuel satırlar
      manualRows.forEach(row => {
        tasks.push({
          title: `${row.content_type} - ${row.company_name}`,
          due_date: today,
          status: "todo",
          company_id: row.company_id,
        });
      });

      if (tasks.length === 0) throw new Error("Hiç seçim yapılmadı");

      await base44.entities.Task.bulkCreate(tasks);
      return tasks.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
      setSelected({});
      setManualRows([]);
      toast.success(`${count} görev oluşturuldu`);
    },
    onError: (e) => toast.error(e.message),
  });

  const markDone = useMutation({
    mutationFn: (id) => base44.entities.Task.update(id, { status: "done" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks-today"] }),
  });

  const markTodo = useMutation({
    mutationFn: (id) => base44.entities.Task.update(id, { status: "todo" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks-today"] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.Task.update(id, { deleted: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks-today"] }),
  });

  const activeTasks = todayTasks.filter(t => t.status !== "done");
  const doneTasks = todayTasks.filter(t => t.status === "done");

  const selectedCount = Object.values(selected).filter(Boolean).length + manualRows.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-gold" /> Anlık Planlama
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{formatDate(new Date())} — Bugünkü planı oluştur ve takip et</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SOL PANEL */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">İçerik Seç</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">

              {/* Tekrarlayan Şablonlar */}
              {templates.map(tmpl => {
                const subscribedIds = tmpl.subscribed_companies || [];
                const relevantCompanies = companies.filter(c => subscribedIds.includes(c.id));
                if (relevantCompanies.length === 0) return null;
                const sectionKey = `tmpl_${tmpl.id}`;
                const isOpen = openSections[sectionKey];
                const allSelected = relevantCompanies.every(c => selected[`tmpl_${tmpl.id}_${c.id}`]);
                const someSelected = relevantCompanies.some(c => selected[`tmpl_${tmpl.id}_${c.id}`]);

                return (
                  <div key={tmpl.id} className="border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center gap-2 px-3 py-2 bg-muted/40 cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => toggleSection(sectionKey)}
                    >
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => {
                          const updates = {};
                          relevantCompanies.forEach(c => { updates[`tmpl_${tmpl.id}_${c.id}`] = !!v; });
                          setSelected(s => ({ ...s, ...updates }));
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-sm font-medium flex-1">{tmpl.emoji || "🔁"} {tmpl.name}</span>
                      {someSelected && !allSelected && <Badge variant="outline" className="text-xs">Kısmi</Badge>}
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    {isOpen && (
                      <div className="divide-y">
                        {relevantCompanies.map(co => {
                          const key = `tmpl_${tmpl.id}_${co.id}`;
                          return (
                            <label key={co.id} className="flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer hover:bg-muted/30">
                              <Checkbox checked={!!selected[key]} onCheckedChange={() => toggleItem(key)} />
                              <span className="flex-1 text-muted-foreground">{co.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bugün / Yakın Özel Günler */}
              {nearSpecialDays.length > 0 && nearSpecialDays.map(day => {
                const sectionKey = `special_${day.id}`;
                const isOpen = openSections[sectionKey];
                const allSelected = companies.every(c => selected[`special_${day.id}_${c.id}`]);
                const left = diffDays(day.next_date);

                return (
                  <div key={day.id} className="border border-gold/30 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center gap-2 px-3 py-2 bg-gold/5 cursor-pointer hover:bg-gold/10 transition-colors"
                      onClick={() => toggleSection(sectionKey)}
                    >
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => {
                          const updates = {};
                          companies.forEach(c => { updates[`special_${day.id}_${c.id}`] = !!v; });
                          setSelected(s => ({ ...s, ...updates }));
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-sm font-medium flex-1">{day.emoji || "📅"} {day.name}</span>
                      <Badge className={left === 0 ? "bg-gold text-slate-900" : "bg-orange-100 text-orange-700 border-orange-200"}>
                        {left === 0 ? "Bugün" : `${left} gün`}
                      </Badge>
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                    {isOpen && (
                      <div className="divide-y">
                        {companies.map(co => {
                          const key = `special_${day.id}_${co.id}`;
                          return (
                            <label key={co.id} className="flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer hover:bg-muted/30">
                              <Checkbox checked={!!selected[key]} onCheckedChange={() => toggleItem(key)} />
                              <span className="flex-1 text-muted-foreground">{co.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Manuel Satır Ekle */}
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Manuel Satır Ekle</div>
                <Select value={manualForm.company_id || "none"} onValueChange={v => setManualForm(f => ({ ...f, company_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Müşteri seç" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Müşteri seç...</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="İçerik tipi (örn: Post, Reels...)"
                    value={manualForm.content_type}
                    onChange={e => setManualForm(f => ({ ...f, content_type: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addManualRow()}
                  />
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={addManualRow}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {manualRows.map(row => (
                  <div key={row.id} className="flex items-center gap-2 text-xs bg-background border rounded px-2 py-1.5">
                    <span className="flex-1">{row.content_type} — <span className="text-muted-foreground">{row.company_name}</span></span>
                    <button onClick={() => setManualRows(r => r.filter(x => x.id !== row.id))} className="text-destructive hover:opacity-70">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-accent hover:bg-accent/90 text-white gap-2"
            disabled={selectedCount === 0 || createPlan.isPending}
            onClick={() => createPlan.mutate()}
          >
            <Zap className="w-4 h-4" /> Plan Oluştur {selectedCount > 0 && `(${selectedCount} öğe)`}
          </Button>
        </div>

        {/* SAĞ PANEL: Bugünün Planı */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-accent" />
                Bugünün Planı
                <Badge variant="outline" className="ml-auto">{activeTasks.length} bekliyor</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1">
              {activeTasks.length === 0 && doneTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Square className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Bugün için görev yok. Sol panelden plan oluştur.
                </div>
              )}

              {activeTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/30 group">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => markDone.mutate(task.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{task.title}</div>
                  </div>
                  <button
                    onClick={() => deleteTask.mutate(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {doneTasks.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider pt-2 pb-1 px-1">
                    Tamamlananlar ({doneTasks.length})
                  </div>
                  {doneTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-200/50 group">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => markTodo.mutate(task.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm line-through text-muted-foreground truncate">{task.title}</div>
                      </div>
                      <button
                        onClick={() => deleteTask.mutate(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}