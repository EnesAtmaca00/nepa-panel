import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Plus, Download, Loader2, Building2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/format";

const DEFAULT_TERMS = `1. Hizmet süresi sözleşme tarihinden itibaren başlar.
2. Aylık ücret her ayın belirlenen gününde tahsil edilir.
3. Sözleşme iptal bildirimi en az 30 gün öncesinden yapılmalıdır.
4. Müşteri, ajansın ürettiği içeriklerin yayınlanmasından sorumludur.
5. Gizlilik: Taraflar birbirlerinin ticari sırlarını korumakla yükümlüdür.`;

const STATUS_LABELS = { draft: "Taslak", active: "Aktif", expired: "Süresi Doldu" };
const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-700",
};
const TYPE_LABELS = { monthly: "Aylık", yearly: "Yıllık", project: "Proje Bazlı" };

export default function Sozlesmeler() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("active");
  const [open, setOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [form, setForm] = useState({
    company_id: "",
    company_name: "",
    contract_type: "monthly",
    start_date: "",
    end_date: "",
    monthly_fee: "",
    services: [],
    terms: DEFAULT_TERMS,
    status: "draft",
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 500),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
  });

  const { data: serviceCatalog = [] } = useQuery({
    queryKey: ["service-catalog"],
    queryFn: () => base44.entities.ServiceCatalog.list("name", 100),
    initialData: [],
  });

  const create = useMutation({
    mutationFn: (d) => base44.entities.Contract.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setOpen(false);
      toast.success("Sözleşme oluşturuldu");
      setForm({ company_id: "", company_name: "", contract_type: "monthly", start_date: "", end_date: "", monthly_fee: "", services: [], terms: DEFAULT_TERMS, status: "draft" });
    },
  });

  const filtered = contracts.filter(c => !c.deleted_at && c.status === (tab === "active" ? "active" : tab === "draft" ? "draft" : "expired"));

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleService = (id) => {
    setForm(f => ({
      ...f,
      services: f.services.includes(id) ? f.services.filter(s => s !== id) : [...f.services, id],
    }));
  };

  const handleCompanyChange = (id) => {
    const c = companies.find(c => c.id === id);
    setField("company_id", id);
    setField("company_name", c?.name || "");
    if (c?.monthly_fee) setField("monthly_fee", c.monthly_fee);
  };

  const generatePDF = async (contract) => {
    setPdfLoading(contract.id);
    try {
      const res = await base44.functions.invoke("generateContractPDF", { contract_id: contract.id });
      const base64 = res.data?.pdf_base64;
      if (!base64) throw new Error("PDF verisi alınamadı");
      const link = document.createElement("a");
      link.href = base64;
      link.download = `sozlesme_${contract.id.slice(-8)}.pdf`;
      link.click();
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("PDF indirildi");
    } catch (e) {
      toast.error("PDF oluşturulamadı: " + e.message);
    } finally {
      setPdfLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sözleşmeler</h1>
          <p className="text-muted-foreground text-sm mt-1">{contracts.length} sözleşme toplam</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 bg-accent hover:bg-accent/90 text-white">
          <Plus className="w-4 h-4" /> Yeni Sözleşme
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Aktif ({contracts.filter(c => c.status === "active").length})</TabsTrigger>
          <TabsTrigger value="draft">Taslak ({contracts.filter(c => c.status === "draft").length})</TabsTrigger>
          <TabsTrigger value="expired">Süresi Dolan ({contracts.filter(c => c.status === "expired").length})</TabsTrigger>
        </TabsList>

        {["active", "draft", "expired"].map(t => (
          <TabsContent key={t} value={t}>
            {filtered.length === 0 ? (
              <Card><CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">Bu kategoride sözleşme yok.</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map(c => (
                  <Card key={c.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{c.company_name || "—"}</span>
                          <Badge className={`${STATUS_COLORS[c.status]} border-0 text-xs`}>{STATUS_LABELS[c.status]}</Badge>
                          <Badge variant="outline" className="text-xs">{TYPE_LABELS[c.contract_type] || c.contract_type}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(c.start_date)} → {formatDate(c.end_date)}</span>
                          {c.monthly_fee > 0 && <span className="font-medium text-foreground">{formatCurrency(c.monthly_fee, "TRY")}/ay</span>}
                          {c.services?.length > 0 && <span>{c.services.length} hizmet</span>}
                        </div>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => generatePDF(c)}
                        disabled={pdfLoading === c.id}
                        className="shrink-0 gap-1"
                      >
                        {pdfLoading === c.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Download className="w-3 h-3" />}
                        PDF İndir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Sözleşme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5">Müşteri *</Label>
              <Select value={form.company_id} onValueChange={handleCompanyChange}>
                <SelectTrigger><SelectValue placeholder="Müşteri seç" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5">Sözleşme Tipi</Label>
                <Select value={form.contract_type} onValueChange={v => setField("contract_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Aylık</SelectItem>
                    <SelectItem value="yearly">Yıllık</SelectItem>
                    <SelectItem value="project">Proje Bazlı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Durum</Label>
                <Select value={form.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Taslak</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5">Başlangıç Tarihi</Label>
                <Input type="date" value={form.start_date} onChange={e => setField("start_date", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Bitiş Tarihi</Label>
                <Input type="date" value={form.end_date} onChange={e => setField("end_date", e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Aylık Ücret (₺)</Label>
              <Input type="number" value={form.monthly_fee} onChange={e => setField("monthly_fee", parseFloat(e.target.value) || 0)} placeholder="0" />
            </div>

            {serviceCatalog.length > 0 && (
              <div>
                <Label className="mb-2">Hizmetler (Katalogdan Seç)</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {serviceCatalog.map(svc => (
                    <div key={svc.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`svc-${svc.id}`}
                        checked={form.services.includes(svc.id)}
                        onCheckedChange={() => toggleService(svc.id)}
                      />
                      <label htmlFor={`svc-${svc.id}`} className="text-sm cursor-pointer flex-1">
                        {svc.name}
                        {svc.unit_price > 0 && <span className="text-xs text-muted-foreground ml-2">₺{svc.unit_price?.toLocaleString("tr-TR")}</span>}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1.5">Koşullar ve Şartlar</Label>
              <Textarea
                rows={6}
                value={form.terms}
                onChange={e => setField("terms", e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button
                onClick={() => create.mutate(form)}
                disabled={create.isPending || !form.company_id}
                className="bg-accent hover:bg-accent/90 text-white"
              >
                {create.isPending ? "Kaydediliyor..." : "Sözleşme Oluştur"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}