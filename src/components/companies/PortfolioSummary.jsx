// Madde 7: Firmalar sayfası portföy özeti
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Wallet, TrendingUp, Crown } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function PortfolioSummary({ companies = [] }) {
  const { data: settingsList = [] } = useQuery({
    queryKey: ["app-settings-portfolio"],
    queryFn: () => base44.entities.AppSettings.list(),
    initialData: [],
  });
  const exchangeRate = settingsList?.[0]?.exchange_rate_eur_try || 38;

  const summary = useMemo(() => {
    const active = companies.filter(c => c.status === "active");
    const totalTRY = active.filter(c => c.currency === "TRY").reduce((s, c) => s + (c.monthly_fee || 0), 0);
    const totalEUR = active.filter(c => c.currency === "EUR").reduce((s, c) => s + (c.monthly_fee || 0), 0);
    const totalInTRY = totalTRY + (totalEUR * exchangeRate);
    const totalInEUR = totalTRY / exchangeRate + totalEUR;
    const avg = active.length > 0 ? totalInTRY / active.length : 0;

    let topCompany = null;
    let topFeeInTRY = 0;
    active.forEach(c => {
      const feeInTRY = c.currency === "EUR" ? (c.monthly_fee || 0) * exchangeRate : (c.monthly_fee || 0);
      if (feeInTRY > topFeeInTRY) {
        topFeeInTRY = feeInTRY;
        topCompany = c;
      }
    });

    return { activeCount: active.length, totalTRY, totalEUR, totalInTRY, totalInEUR, avg, topCompany };
  }, [companies, exchangeRate]);

  if (summary.activeCount === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Users className="w-3 h-3" /> Toplam Aktif
          </div>
          <div className="text-xl md:text-2xl font-bold mt-1">{summary.activeCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Wallet className="w-3 h-3" /> Aylık Gelir
          </div>
          <div className="text-base md:text-lg font-bold mt-1">{formatCurrency(summary.totalTRY, "TRY")}</div>
          {summary.totalEUR > 0 && (
            <div className="text-xs text-muted-foreground">+ {formatCurrency(summary.totalEUR, "EUR")}</div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">~ {formatCurrency(summary.totalInEUR, "EUR")}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <TrendingUp className="w-3 h-3" /> Ortalama
          </div>
          <div className="text-base md:text-lg font-bold mt-1">{formatCurrency(summary.avg, "TRY")}</div>
          <div className="text-[10px] text-muted-foreground">müşteri/ay</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Crown className="w-3 h-3 text-gold" /> En Değerli
          </div>
          <div className="text-sm md:text-base font-bold mt-1 truncate">{summary.topCompany?.name || "—"}</div>
          {summary.topCompany && (
            <div className="text-[10px] text-muted-foreground">
              {formatCurrency(summary.topCompany.monthly_fee, summary.topCompany.currency)}/ay
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}