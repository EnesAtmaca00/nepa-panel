import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Plus, Trash2, Edit, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { formatDate, startOfMonth, endOfMonth } from "@/lib/format";

const CATEGORY_LABELS = {
  subscription: "Abonelik",
  salary: "Maaş",
  office: "Ofis",
  marketing: "Pazarlama",
  software: "Yazılım",
  tax: "Vergi",
  other: "Diğer",
};

const CATEGORY_COLORS = {
  subscription: "bg-blue-50 text-blue-700 border-blue-200",
  salary: "bg-purple-50 text-purple-700 border-purple-200",
  office: "bg-amber-50 text-amber-700 border-amber-200",
  marketing: "bg-pink-50 text-pink-700 border-pink-200",
  software: "bg-indigo-50 text-indigo-700 border-indigo-200",
  tax: "bg-red-50 text-red-700 border-red-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

const FREQ_LABELS = { monthly: "Aylık", yearly: "Yıllık", quarterly: "3 Aylık" };

const EMPTY_FORM = {
  title: "", amount: "", category: "other", payment_date: new Date().toISOString().split("T")[0],
  is_recurring: false, recurring_frequency: "monthly", next_payment_date: "", notes: "",
  company_id: "", company_name: "", status: "pending",
};

export default function Giderler() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.filter({ deleted_at: null }, "-payment_date", 200),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const monthStart = startOfMonth().toISOString().split("T")[0];
  const monthEnd = endOfMonth().toISOString().split("T")[0];
  const thisMonthTotal = expenses
    .filter(e => e.payment_date >= monthStart && e.payment_date <= monthEnd)
    .reduce((s, e) => s + (e.amount || 0), 0);

  const saveExpense = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, amount: parseFloat(data.amount) || 0 };
      if (payload.company_id) {
        const co = companies.find(c => c.id === payload.company_id);
        if (co) payload.company_name = co.name;
      } else {
        payload.company_name = "";
      }
      if (editExpense) return base44.entities.Expense.update(editExpense.id, payload);
      return base44.entities.Expense.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
      setEditExpense(null);
      setForm(EMPTY_FORM);
      toast.success("Gider kaydedildi");
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (id) => base44.entities.Expense.update(id, { deleted_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gider silindi");
    },
  });

  const openEdit = (exp) => {
    setEditExpense(exp);
    setForm({ ...EMPTY_FORM, ...exp, amount: String(exp.amount) });
    setShowForm(true);
  };

  const openNew = () => {
    setEditExpense(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const recurring = expenses.filter(e => e.is_recurring);
  const oneTime = expenses.filter(e => !e.is_recurring);

  const ExpenseRow = ({ exp }) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{exp.title}</div>
        {exp.company_name && (
          <div className="text-xs text-muted-foreground">{exp.company_name}</div>
        )}
      </div>
      <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${CATEGORY_COLORS[exp.category] || ""}`}>
        {CATEGORY_LABELS[exp.category] || exp.category}
      </Badge>
      {exp.is_recurring && (
        <Badge variant="outline" className="text-xs hidden sm:inline-flex bg-violet-50 text-violet-700 border-violet-200">
          {FREQ_LABELS[exp.recurring_frequency] || "Tekrarlayan"}
        </Badge>
      )}
      <div className="text-sm font-semibold text-right min-w-[80px]">₺{(exp.amount || 0).toLocaleString("tr-TR")}</div>
      <div className="text-xs text-muted-foreground hidden md:block min-w-[80px] text-right">{formatDate(exp.payment_date)}</div>
      <Badge variant="outline" className={exp.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
        {exp.status === "paid" ? "Ödendi" : "Bekliyor"}
      </Badge>
      <div className="flex gap-1">
        <button onClick={() => openEdit(exp)} className="p-1.5 text-muted-foreground hover:text-foreground">
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => deleteExpense.mutate(exp.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-accent" /> Gider Yönetimi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Bu ay toplam: <strong>₺{thisMonthTotal.toLocaleString("tr-TR")}</strong></p>
        </div>
        <Button onClick={openNew} className="bg-accent hover:bg-accent/90 text-white gap-2">
          <Plus className="w-4 h-4" /> Yeni Gider
        </Button>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-xl font-semibold text-red-600">₺{thisMonthTotal.toLocaleString("tr-TR")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Bu Ay Gider</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-xl font-semibold">{recurring.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Tekrarlayan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-xl font-semibold">{expenses.filter(e => e.status === "pending").length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Bekleyen Ödeme</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Hepsi ({expenses.length})</TabsTrigger>
          <TabsTrigger value="recurring">Tekrarlayan ({recurring.length})</TabsTrigger>
          <TabsTrigger value="onetime">Tek Seferlik ({oneTime.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-2">
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Henüz gider yok.
            </div>
          ) : expenses.map(e => <ExpenseRow key={e.id} exp={e} />)}
        </TabsContent>

        <TabsContent value="recurring" className="mt-4 space-y-2">
          {recurring.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Tekrarlayan gider yok.</div>
          ) : recurring.map(e => <ExpenseRow key={e.id} exp={e} />)}
        </TabsContent>

        <TabsContent value="onetime" className="mt-4 space-y-2">
          {oneTime.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Tek seferlik gider yok.</div>
          ) : oneTime.map(e => <ExpenseRow key={e.id} exp={e} />)}
        </TabsContent>
      </Tabs>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editExpense ? "Gideri Düzenle" : "Yeni Gider"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1">Başlık</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn: Sunucu faturası" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Tutar (₺)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label className="mb-1">Kategori</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1">Ödeme Tarihi</Label>
                <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1">Durum</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="paid">Ödendi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: v }))} />
              <Label>Tekrarlayan gider</Label>
            </div>
            {form.is_recurring && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1">Sıklık</Label>
                  <Select value={form.recurring_frequency} onValueChange={v => setForm(f => ({ ...f, recurring_frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Aylık</SelectItem>
                      <SelectItem value="quarterly">3 Aylık</SelectItem>
                      <SelectItem value="yearly">Yıllık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1">Sonraki Ödeme</Label>
                  <Input type="date" value={form.next_payment_date} onChange={e => setForm(f => ({ ...f, next_payment_date: e.target.value }))} />
                </div>
              </div>
            )}
            <div>
              <Label className="mb-1">Müşteri (opsiyonel)</Label>
              <Select value={form.company_id || "none"} onValueChange={v => setForm(f => ({ ...f, company_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yok</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">Not</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ek bilgi..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button onClick={() => saveExpense.mutate(form)} disabled={saveExpense.isPending} className="bg-accent hover:bg-accent/90 text-white">
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}