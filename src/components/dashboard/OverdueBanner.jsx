// Madde 4: Dashboard hero — overdue fatura uyarı şeridi
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, diffDays } from "@/lib/format";

export default function OverdueBanner() {
  const { data: invoices = [] } = useQuery({
    queryKey: ["overdue-banner-invoices"],
    queryFn: () => base44.entities.Invoice.filter({ deleted: false }, "-issue_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const overdue = invoices
    .filter(i => i.status === "overdue" || (i.status === "pending" && i.due_date && diffDays(i.due_date) < 0))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  if (overdue.length === 0) return null;

  return (
    <div className="space-y-2">
      {overdue.slice(0, 3).map(inv => {
        const days = Math.abs(diffDays(inv.due_date));
        const remaining = (inv.amount || 0) - (inv.paid_amount || 0);
        return (
          <div
            key={inv.id}
            className="flex items-center gap-3 p-3 md:p-4 rounded-lg border-2 border-red-300 bg-red-50 text-red-900"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm md:text-base truncate">
                💸 Vadesi geçmiş fatura: {inv.company_name} — {formatCurrency(remaining, inv.currency)} — {days} gündür bekliyor
              </div>
            </div>
            <Button size="sm" variant="outline" asChild className="bg-white border-red-300 hover:bg-red-100 shrink-0">
              <Link to="/faturalar">Faturayı Gör <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        );
      })}
      {overdue.length > 3 && (
        <Link to="/faturalar" className="block text-xs text-red-700 hover:underline px-3">
          +{overdue.length - 3} fatura daha vadesi geçmiş →
        </Link>
      )}
    </div>
  );
}