import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, todayISO } from "@/lib/format";
import { toast } from "sonner";
import InvoiceFormDialog from "@/components/invoices/InvoiceFormDialog";

export default function TabInvoices({ company }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", company.id],
    queryFn: () => base44.entities.Invoice.filter({ company_id: company.id }, "-issue_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const markPaid = useMutation({
    mutationFn: (inv) => base44.entities.Invoice.update(inv.id, {
      status: "paid",
      paid_amount: inv.amount,
      paid_date: todayISO(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Fatura ödendi olarak işaretlendi");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Faturalar</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Fatura Ekle
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Henüz fatura yok.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Tarih</th>
                    <th className="text-left p-3">Tip</th>
                    <th className="text-right p-3">Tutar</th>
                    <th className="text-left p-3">Vade</th>
                    <th className="text-left p-3">Durum</th>
                    <th className="text-right p-3">Eylem</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">{formatDate(inv.issue_date)}</td>
                      <td className="p-3 text-xs">
                        {inv.type === "monthly_subscription" ? "Aylık" : "Tek Seferlik"}
                      </td>
                      <td className="p-3 text-right font-medium">{formatCurrency(inv.amount, inv.currency)}</td>
                      <td className="p-3">{formatDate(inv.due_date)}</td>
                      <td className="p-3">
                        <Badge className={getStatusColor(inv.status)}>{getStatusLabel(inv.status)}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        {inv.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => markPaid.mutate(inv)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Ödendi
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <InvoiceFormDialog
        open={open}
        onOpenChange={setOpen}
        company={company}
        invoice={editing}
      />
    </div>
  );
}