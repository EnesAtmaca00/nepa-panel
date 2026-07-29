import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, GripVertical, Archive, CheckCheck, Clock3 } from "lucide-react";
import { toast } from "sonner";
import TaskDialog from "@/components/tasks/TaskDialog";

const COLUMNS = [
  { id: "todo", label: "Yapılacak", color: "bg-slate-100 dark:bg-slate-800" },
  { id: "in_progress", label: "Devam Ediyor", color: "bg-blue-100 dark:bg-blue-900/30" },
  { id: "review", label: "İncelemede", color: "bg-yellow-100 dark:bg-yellow-900/30" },
];

const PRIORITY_COLOR = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const PRIORITY_LABEL = { urgent: "Acil", high: "Yüksek", medium: "Orta", low: "Düşük" };

export default function Tasks() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.filter({ deleted: false }, "-created_date", 500),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
  });

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== "done"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => t.status === "done"), [tasks]);

  const grouped = useMemo(() => {
    const map = {};
    COLUMNS.forEach(c => map[c.id] = []);
    activeTasks.forEach(t => {
      const col = t.status || "todo";
      if (map[col]) map[col].push(t);
    });
    return map;
  }, [activeTasks]);

  const todoTasks = grouped["todo"] || [];
  const today = new Date();
  const overdue3Days = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 3);
    return todoTasks.filter(t => t.due_date && new Date(t.due_date) < cutoff);
  }, [todoTasks]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const bulkComplete = useMutation({
    mutationFn: async (taskList) => {
      for (const t of taskList) {
        await base44.entities.Task.update(t.id, { status: "done" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Görevler tamamlandı");
    },
  });

  const handleDrop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("task-id");
    if (id) updateStatus.mutate({ id, status });
  };

  const companyName = (id) => companies.find(c => c.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Görevler & Workflow</h1>
          <p className="text-muted-foreground text-sm mt-1">{activeTasks.length} aktif · {doneTasks.length} tamamlanmış</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setArchiveOpen(true)} className="gap-2">
            <Archive className="w-4 h-4" /> Eski Görevler ({doneTasks.length})
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Görev
          </Button>
        </div>
      </div>

      {/* Toplu işlem butonları */}
      {(todoTasks.length > 0 || overdue3Days.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {todoTasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={() => bulkComplete.mutate(todoTasks)}
              disabled={bulkComplete.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Tümünü Tamamla ({todoTasks.length})
            </Button>
          )}
          {overdue3Days.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => bulkComplete.mutate(overdue3Days)}
              disabled={bulkComplete.isPending}
            >
              <Clock3 className="w-3.5 h-3.5" /> 3 Günü Geçenleri Tamamla ({overdue3Days.length})
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`rounded-xl ${col.color} p-3 min-h-[400px]`}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider">{col.label}</h3>
              <Badge variant="outline" className="text-xs">{grouped[col.id].length}</Badge>
            </div>
            <div className="space-y-2">
              {grouped[col.id].map(task => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("task-id", task.id)}
                  onClick={() => { setEditing(task); setOpen(true); }}
                  className="cursor-pointer hover:shadow-md hover:border-gold transition-all"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                        {task.company_id && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{companyName(task.company_id)}</p>
                        )}
                      </div>
                      <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge className={`${PRIORITY_COLOR[task.priority]} text-[10px] px-1.5`}>
                        {PRIORITY_LABEL[task.priority]}
                      </Badge>
                      {task.due_date && (
                        <span className="text-[10px] text-muted-foreground">{task.due_date}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Eski Görevler Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" /> Tamamlanan Görevler ({doneTasks.length})
            </DialogTitle>
          </DialogHeader>
          {doneTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Tamamlanan görev yok.</p>
          ) : (
            <div className="space-y-2">
              {doneTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.company_id && <span className="text-[10px] text-muted-foreground">{companyName(task.company_id)}</span>}
                      {task.due_date && <span className="text-[10px] text-muted-foreground">{task.due_date}</span>}
                      <Badge className={`${PRIORITY_COLOR[task.priority]} text-[10px] px-1.5`}>{PRIORITY_LABEL[task.priority]}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => updateStatus.mutate({ id: task.id, status: "todo" })}
                  >
                    Yeniden Aç
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TaskDialog open={open} onOpenChange={setOpen} task={editing} companies={companies} />
    </div>
  );
}