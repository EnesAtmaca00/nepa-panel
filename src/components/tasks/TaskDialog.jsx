import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT = { title: "", description: "", company_id: "", due_date: "", priority: "medium", status: "todo" };

export default function TaskDialog({ open, onOpenChange, task, companies }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(DEFAULT);

  useEffect(() => {
    setData(task ? { ...task } : DEFAULT);
  }, [task, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (data.id) return base44.entities.Task.update(data.id, data);
      return base44.entities.Task.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Kaydedildi");
      onOpenChange(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => base44.entities.Task.update(data.id, { deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Görev silindi");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{data.id ? "Görevi Düzenle" : "Yeni Görev"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5">Başlık</Label>
            <Input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5">Açıklama</Label>
            <Textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5">Müşteri</Label>
              <Select value={data.company_id || "none"} onValueChange={(v) => setData({ ...data, company_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Yok —</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Tarih</Label>
              <Input type="date" value={data.due_date || ""} onChange={(e) => setData({ ...data, due_date: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5">Öncelik</Label>
              <Select value={data.priority} onValueChange={(v) => setData({ ...data, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Acil</SelectItem>
                  <SelectItem value="high">🟠 Yüksek</SelectItem>
                  <SelectItem value="medium">🔵 Orta</SelectItem>
                  <SelectItem value="low">⚪ Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Durum</Label>
              <Select value={data.status} onValueChange={(v) => setData({ ...data, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Yapılacak</SelectItem>
                  <SelectItem value="in_progress">Devam</SelectItem>
                  <SelectItem value="review">İncelemede</SelectItem>
                  <SelectItem value="done">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {data.id && (
            <Button variant="outline" size="sm" onClick={() => remove.mutate()} className="mr-auto">
              <Trash2 className="w-3 h-3 mr-1" /> Sil
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !data.title}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}