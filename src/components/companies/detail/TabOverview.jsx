import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, todayISO } from "@/lib/format";
import { Mail, Phone, Globe, Calendar as CalendarIcon, Receipt, Target } from "lucide-react";

export default function TabOverview({ company }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", company.id],
    queryFn: () => base44.entities.Invoice.filter({ company_id: company.id }, "-issue_date", 100),
    initialData: [],
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["targets", company.id],
    queryFn: () => base44.entities.TargetTracking.filter({ company_id: company.id }, "-period_start", 20),
    initialData: [],
  });

  const stats = useMemo(() => {
    const open = invoices.filter(i => i.status !== "paid");
    const openTotal = open.reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);
    const paidTotal = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
    return { openTotal, paidTotal, openCount: open.length };
  }, [invoices]);

  const currentMonthlyTarget = useMemo(() => {
    return targets.find(t => t.period_type === "monthly" && t.period_start <= todayISO() && t.period_end >= todayISO());
  }, [targets]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Şirket Bilgileri</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {company.brand_description && (
            <div>
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Marka Tanımı</div>
              <p className="text-sm">{company.brand_description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {company.contact_person && (
              <div>
                <div className="text-xs text-muted-foreground">İlgili Kişi</div>
                <div>{company.contact_person}</div>
              </div>
            )}
            {company.phone && (
              <div>
                <div className="text-xs text-muted-foreground"><Phone className="w-3 h-3 inline mr-1" /> Telefon</div>
                <div>{company.phone}</div>
              </div>
            )}
            {company.email && (
              <div>
                <div className="text-xs text-muted-foreground"><Mail className="w-3 h-3 inline mr-1" /> E-posta</div>
                <div className="truncate">{company.email}</div>
              </div>
            )}
            {company.website && (
              <div>
                <div className="text-xs text-muted-foreground"><Globe className="w-3 h-3 inline mr-1" /> Web</div>
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline truncate block">{company.website}</a>
              </div>
            )}
          </div>

          {(company.contract_start_date || company.contract_end_date) && (
            <div className="border-t pt-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> Sözleşme
              </div>
              <div className="text-sm">
                {formatDate(company.contract_start_date)} – {formatDate(company.contract_end_date)}
              </div>
            </div>
          )}

          {company.brand_keywords?.length > 0 && (
            <div className="border-t pt-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Anahtar Kelimeler</div>
              <div className="flex flex-wrap gap-1.5">
                {company.brand_keywords.map((k, i) => <Badge key={i} variant="secondary">{k}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-gold" /> Finans</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Aylık Ücret</div>
              <div className="text-xl font-bold">{formatCurrency(company.monthly_fee, company.currency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Açık Borç</div>
              <div className="text-lg font-semibold text-destructive">
                {formatCurrency(stats.openTotal, company.currency)}
              </div>
              <div className="text-xs text-muted-foreground">{stats.openCount} bekleyen fatura</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Toplam Tahsilat</div>
              <div className="text-lg font-semibold text-emerald-600">
                {formatCurrency(stats.paidTotal, company.currency)}
              </div>
            </div>
          </CardContent>
        </Card>

        {currentMonthlyTarget && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-gold" /> Bu Ay Hedef</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">%{currentMonthlyTarget.completion_percentage}</span>
                <Badge className={getStatusColor(currentMonthlyTarget.status)}>
                  {getStatusLabel(currentMonthlyTarget.status)}
                </Badge>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${Math.min(currentMonthlyTarget.completion_percentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}