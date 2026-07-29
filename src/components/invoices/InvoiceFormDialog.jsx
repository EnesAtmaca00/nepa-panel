import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { todayISO, addDays } from "@/lib/format";
import { toast } from "sonner";
import InvoiceLineItems from "./InvoiceLineItems";
import InvoiceTotals, { computeTotals } from "./InvoiceTotals";

const emptyLine = { description: "", quantity: 1, unit_price: 0, tax_rate: 20, total: 0 };

export default function InvoiceFormDialog({ open, onOpenChange, company, invoice }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState({
    amount: 0,
    currency: "TRY",
    type: "monthly_subscription",
    issue_date: todayISO(),
    due_date: addDays(todayISO(), 7),
    note: "",
    tax_mode: "excluded",
    line_items: [{ ...emptyLine }],
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });
  const settings = settingsList[0] || {};

  const { data: templates = [] } = useQuery({
    queryKey: ["invoice-templates"],
    queryFn: () => base44.entities.InvoiceTemplate.list(),
    staleTime: 60000,
  });

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setData({
        ...invoice,
        line_items: invoice.line_items?.length ? invoice.line_items : [{ ...emptyLine }],
      });
    } else if (company) {
      const defaultTemplate = templates.find(t => t.is_default);
      setData({
        amount: company.monthly_fee || 0,
        currency: company.currency || settings.default_currency || "TRY",
        type: "monthly_subscription",
        issue_date: todayISO(),
        due_date: addDays(todayISO(), 7),
        note: "",
        tax_mode: settings.default_tax_mode || "excluded",
        line_items: [{ ...emptyLine }],
        template_id: defaultTemplate?.id || "",
      });
    }
  }, [invoice, company, open]);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const handleLineItemsChange = (items) => {
    const { total } = computeTotals(items, data.tax_mode);
    set("line_items", items);
    set("amount", total);
  };

  const { subtotal, taxAmount, total } = computeTotals(data.line_items || [], data.tax_mode);

  const save = useMutation({
    mutationFn: async () => {
      const { subtotal, taxAmount, total } = computeTotals(data.line_items || [], data.tax_mode);
      const payload = {
        ...data,
        company_id: company?.id || data.company_id,
        company_name: company?.name || data.company_name,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        amount: total,
      };
      if (invoice?.id) return base44.entities.Invoice.update(invoice.id, payload);
      return base44.entities.Invoice.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(invoice ? "Fatura güncellendi" : "Fatura oluşturuldu");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Faturayı Düzenle" : "Yeni Fatura"}</DialogTitle>
          {company && <p className="text-sm text-muted-foreground">{company.name}</p>}
        </DialogHeader>

        <Tabs defaultValue="kalemler">
          <TabsList className="mb-4">
            <TabsTrigger value="kalemler">Hizmet Kalemleri</TabsTrigger>
            <TabsTrigger value="detaylar">Fatura Detayları</TabsTrigger>
            <TabsTrigger value="musteri">Müşteri Bilgileri</TabsTrigger>
          </TabsList>

          {/* KALEMLER */}
          <TabsContent value="kalemler" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Para Birimi</Label>
                <Select value={data.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">₺ TRY</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">KDV Modu</Label>
                <Select value={data.tax_mode} onValueChange={(v) => set("tax_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excluded">KDV Hariç (fiyatlara KDV eklenir)</SelectItem>
                    <SelectItem value="included">KDV Dahil (fiyatlara KDV dahil)</SelectItem>
                    <SelectItem value="none">KDV Yok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Hizmet Kalemleri</Label>
              <InvoiceLineItems
                lineItems={data.line_items || []}
                onChange={handleLineItemsChange}
                currency={data.currency}
              />
            </div>

            <InvoiceTotals lineItems={data.line_items || []} taxMode={data.tax_mode} currency={data.currency} />
          </TabsContent>

          {/* DETAYLAR */}
          <TabsContent value="detaylar" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Fatura Tipi</Label>
                <Select value={data.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly_subscription">Aylık Abonelik</SelectItem>
                    <SelectItem value="one_time">Tek Seferlik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Şablon</Label>
                <Select value={data.template_id || ""} onValueChange={(v) => set("template_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Şablon seçin..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Varsayılan</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default ? "(Varsayılan)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Kesim Tarihi</Label>
                <Input type="date" value={data.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Vade Tarihi</Label>
                <Input type="date" value={data.due_date} onChange={(e) => set("due_date", e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="mb-1.5">Fatura No (opsiyonel)</Label>
              <Input value={data.invoice_number || ""} onChange={(e) => set("invoice_number", e.target.value)} placeholder={`${settings.invoice_prefix || "FAT"}-2024-001`} />
            </div>

            <div>
              <Label className="mb-1.5">Not</Label>
              <Textarea value={data.note || ""} onChange={(e) => set("note", e.target.value)} placeholder="Opsiyonel açıklama..." rows={2} />
            </div>
          </TabsContent>

          {/* MÜŞTERİ BİLGİLERİ */}
          <TabsContent value="musteri" className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              Bu bilgiler müşteri profiliyle senkronize. Değişiklikler müşteri kartını da günceller.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5">Fatura Adı / Yetkili</Label>
                <Input
                  value={data.billing_contact_name || company?.billing_contact_name || ""}
                  onChange={e => set("billing_contact_name", e.target.value)}
                  placeholder="Ad Soyad veya Ünvan"
                />
              </div>
              <div>
                <Label className="mb-1.5">Fatura E-postası</Label>
                <Input
                  type="email"
                  value={data.billing_email || company?.billing_email || company?.email || ""}
                  onChange={e => set("billing_email", e.target.value)}
                  placeholder="fatura@sirket.com"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5">Vergi Numarası</Label>
              <Input
                value={data.tax_number || company?.tax_number || ""}
                onChange={e => set("tax_number", e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div>
              <Label className="mb-1.5">Fatura Adresi</Label>
              <Textarea
                value={data.billing_address || company?.billing_address || ""}
                onChange={e => set("billing_address", e.target.value)}
                placeholder="Adres, Mahalle, Cadde..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5">Şehir</Label>
                <Input
                  value={data.billing_city || company?.billing_city || ""}
                  onChange={e => set("billing_city", e.target.value)}
                  placeholder="İstanbul"
                />
              </div>
              <div>
                <Label className="mb-1.5">Posta Kodu</Label>
                <Input
                  value={data.billing_postal_code || company?.billing_postal_code || ""}
                  onChange={e => set("billing_postal_code", e.target.value)}
                  placeholder="34000"
                />
              </div>
              <div>
                <Label className="mb-1.5">Ülke</Label>
                <Input
                  value={data.billing_country || company?.billing_country || ""}
                  onChange={e => set("billing_country", e.target.value)}
                  placeholder="Türkiye"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}