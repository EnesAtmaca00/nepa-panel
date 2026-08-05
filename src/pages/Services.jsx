import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ShoppingBag, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const DEFAULT_FORM = { name: "", billing_type: "monthly", default_price_try: 0, default_price_eur: 0, description: "", active: true };

export default function Services() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [seeding, setSeeding] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.ServiceCatalog.list("name", 100),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const save = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) return base44.entities.ServiceCatalog.update(payload.id, payload);
      return base44.entities.ServiceCatalog.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Kaydedildi");
      setOpen(false);
      setForm(DEFAULT_FORM);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.ServiceCatalog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Silindi");
    },
  });

  const seedAll = async () => {
    setSeeding(true);
    try {
      const res = await base44.functions.invoke("seedAppData", {});
      const data = res.data || {};
      const total = (data.services || 0) + (data.special_days || 0) + (data.recurring_templates || 0);
      if (total > 0) {
        toast.success(`${data.services} hizmet, ${data.special_days} özel gün, ${data.recurring_templates} şablon eklendi`);
      } else {
        toast.info("Tüm seed veriler zaten mevcut");
      }
      queryClient.invalidateQueries();
    } catch (e) {
      toast.error("Seed yüklenemedi");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hizmet Kataloğu</h1>
          <p className="text-muted-foreground text-sm mt-1">{services.length} hizmet tanımlı</p>
        </div>
        <div className="flex gap-2">
          {services.length === 0 && (
            <Button variant="outline" onClick={seedAll} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Hazır Seti Yükle
            </Button>
          )}
          <Button onClick={() => { setForm(DEFAULT_FORM); setOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Hizmet
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Henüz hizmet tanımlanmadı.</p>
            <Button onClick={seedAll} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Hazır 10 Hizmeti Yükle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {s.billing_type === "monthly" ? "Aylık" : "Tek Seferlik"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(s); setOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Türkiye</span>
                    <span className="font-medium">{formatCurrency(s.default_price_try, "TRY")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Belçika</span>
                    <span className="font-medium">{formatCurrency(s.default_price_eur, "EUR")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Hizmeti Düzenle" : "Yeni Hizmet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5">Hizmet Adı</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn: Sosyal Medya Yönetimi" />
            </div>
            <div>
              <Label className="mb-1.5">Faturalama Tipi</Label>
              <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Aylık Abonelik</SelectItem>
                  <SelectItem value="one_time">Tek Seferlik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Varsayılan TL Fiyat</Label>
                <Input type="number" value={form.default_price_try} onChange={(e) => setForm({ ...form, default_price_try: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="mb-1.5">Varsayılan EUR Fiyat</Label>
                <Input type="number" value={form.default_price_eur} onChange={(e) => setForm({ ...form, default_price_eur: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name}>
              {save.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}