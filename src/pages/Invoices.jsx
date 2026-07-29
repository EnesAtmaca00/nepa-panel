import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Receipt, CheckCircle2, Download, Loader2, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, todayISO, diffDays } from "@/lib/format";
import { toast } from "sonner";

export default function Invoices() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [currency, setCurrency] = useState("all");
  const [pdfLoading, setPdfLoading] = useState(null);

  const deleteInvoice = useMutation({
    mutationFn: (id) => base44.entities.Invoice.update(id, { deleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Fatura silindi");
    },
  });

  const undoPayment = useMutation({
    mutationFn: (id) => base44.entities.Invoice.update(id, {
      status: 'pending', paid_amount: 0, payment_date: null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Ödeme geri çekildi");
    },
  });

  const downloadPDF = async (inv) => {
    if (inv.pdf_url) {
      const link = document.createElement("a");
      link.href = inv.pdf_url;
      link.download = `fatura_${inv.id.slice(-8)}.pdf`;
      link.click();
      return;
    }
    setPdfLoading(inv.id);
    try {
      const res = await base44.functions.invoke("generateInvoicePDF", { invoice_id: inv.id });
      const base64 = res.data?.pdf_base64;
      if (!base64) throw new Error("PDF verisi alınamadı");
      const link = document.createElement("a");
      link.href = base64;
      link.download = `fatura_${inv.id.slice(-8)}.pdf`;
      link.click();
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("PDF indirildi");
    } catch (e) {
      toast.error("PDF oluşturulamadı: " + e.message);
    } finally {
      setPdfLoading(null);
    }
  };

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.filter({ deleted: false }, "-issue_date", 500),
    initialData: [],
  });

  // Otomatik overdue tespit ve güncelleme
  useEffect(() => {
    if (!invoices.length) return;
    const toUpdate = invoices.filter(i => i.status === "pending" && diffDays(i.due_date) < 0);
    if (toUpdate.length === 0) return;
    Promise.all(
      toUpdate.map(i => base44.entities.Invoice.update(i.id, { status: "overdue" }).catch(() => null))
    ).then(() => {
      if (toUpdate.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
    });
  }, [invoices.length]); // eslint-disable-line

  const markPaid = useMutation({
    mutationFn: (inv) => base44.entities.Invoice.update(inv.id, {
      status: "paid", paid_amount: inv.amount, paid_date: todayISO(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Ödendi olarak işaretlendi");
    },
  });

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      if (search && !i.company_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== "all") {
        if (status === "overdue" && i.status !== "overdue" && !(i.status === "pending" && diffDays(i.due_date) < 0)) return false;
        if (status !== "overdue" && i.status !== status) return false;
      }
      if (currency !== "all" && i.currency !== currency) return false;
      return true;
    });
  }, [invoices, search, status, currency]);

  const totals = useMemo(() => {
    const t = { TRY: { open: 0, paid: 0 }, EUR: { open: 0, paid: 0 } };
    invoices.forEach(i => {
      const cur = i.currency || "TRY";
      if (i.status === "paid") t[cur].paid += i.amount || 0;
      else t[cur].open += (i.amount || 0) - (i.paid_amount || 0);
    });
    return t;
  }, [invoices]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Faturalar</h1>
        <p className="text-muted-foreground text-sm mt-1">{invoices.length} fatura toplam</p>
      </div>

      {/* Özet kartlar — 2 kolon mobil, 4 masaüstü */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 md:p-4">
          <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Açık (₺)</div>
          <div className="text-lg md:text-xl font-bold text-destructive mt-1 truncate">{formatCurrency(totals.TRY.open, "TRY")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-4">
          <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Tahsil (₺)</div>
          <div className="text-lg md:text-xl font-bold text-emerald-600 mt-1 truncate">{formatCurrency(totals.TRY.paid, "TRY")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-4">
          <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Açık (€)</div>
          <div className="text-lg md:text-xl font-bold text-destructive mt-1 truncate">{formatCurrency(totals.EUR.open, "EUR")}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-4">
          <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">Tahsil (€)</div>
          <div className="text-lg md:text-xl font-bold text-emerald-600 mt-1 truncate">{formatCurrency(totals.EUR.paid, "EUR")}</div>
        </CardContent></Card>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Şirket ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="flex-1 sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="pending">Bekleyen</SelectItem>
              <SelectItem value="paid">Ödenen</SelectItem>
              <SelectItem value="overdue">Geciken</SelectItem>
            </SelectContent>
          </Select>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-24 sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Pb</SelectItem>
              <SelectItem value="TRY">₺ TRY</SelectItem>
              <SelectItem value="EUR">€ EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* İçerik */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Filtreyle eşleşen fatura yok.</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Masaüstü tablo */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="text-left p-3">Şirket</th>
                        <th className="text-left p-3">Kesim</th>
                        <th className="text-left p-3">Vade</th>
                        <th className="text-right p-3">Tutar</th>
                        <th className="text-left p-3">Durum</th>
                        <th className="text-right p-3">PDF</th>
                        <th className="text-right p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(inv => {
                        const isOverdue = inv.status === "overdue" || (inv.status === "pending" && diffDays(inv.due_date) < 0);
                        const isDueSoon = inv.status === "pending" && diffDays(inv.due_date) >= 0 && diffDays(inv.due_date) <= 3;
                        return (
                          <tr key={inv.id} className={`border-t transition-colors ${isOverdue ? "bg-rose-50/60 hover:bg-rose-100/60" : "hover:bg-muted/30"}`}>
                            <td className="p-3">
                              <Link to={`/musteriler/${inv.company_id}`} className="hover:text-gold font-medium">
                                {inv.company_name}
                              </Link>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{formatDate(inv.issue_date)}</td>
                            <td className="p-3 text-xs">
                              {formatDate(inv.due_date)}
                              {isOverdue && <span className="block text-destructive text-[10px] font-bold">⚠️ Vadesi Geçti ({Math.abs(diffDays(inv.due_date))}g)</span>}
                              {isDueSoon && !isOverdue && <span className="block text-amber-600 text-[10px] font-medium">🔔 {diffDays(inv.due_date)} gün kaldı</span>}
                            </td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(inv.amount, inv.currency)}</td>
                            <td className="p-3">
                              <Badge className={getStatusColor(isOverdue ? "overdue" : inv.status)}>
                                {getStatusLabel(isOverdue ? "overdue" : inv.status)}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => downloadPDF(inv)} disabled={pdfLoading === inv.id}>
                                {pdfLoading === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              </Button>
                            </td>
                            <td className="p-3 text-right">
                              {inv.status !== "paid" ? (
                                <Button size="sm" variant="outline" onClick={() => markPaid.mutate(inv)}>
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ödendi
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" className="text-muted-foreground text-xs" onClick={() => undoPayment.mutate(inv.id)}>
                                  Geri Al
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobil kart listesi */}
          <div className="md:hidden space-y-2">
            {filtered.map(inv => {
              const isOverdue = inv.status === "pending" && diffDays(inv.due_date) < 0;
              const statusKey = isOverdue ? "overdue" : inv.status;
              return (
                <Card key={inv.id} className={isOverdue ? "border-destructive/40" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link to={`/musteriler/${inv.company_id}`} className="font-semibold text-sm hover:text-gold leading-tight">
                        {inv.company_name}
                      </Link>
                      <Badge className={`${getStatusColor(statusKey)} flex-shrink-0 text-[10px]`}>
                        {getStatusLabel(statusKey)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>Kesim: {formatDate(inv.issue_date)}</span>
                      <span className={isOverdue ? "text-destructive font-medium" : ""}>
                        Vade: {formatDate(inv.due_date)}
                        {isOverdue && ` (${Math.abs(diffDays(inv.due_date))}g gecikti)`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base">{formatCurrency(inv.amount, inv.currency)}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => downloadPDF(inv)} disabled={pdfLoading === inv.id}>
                          {pdfLoading === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </Button>
                        {inv.status !== "paid" ? (
                          <Button size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => markPaid.mutate(inv)}>
                            <CheckCircle2 className="w-3 h-3" /> Ödendi
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs text-muted-foreground" onClick={() => undoPayment.mutate(inv.id)}>
                            Geri Al
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}