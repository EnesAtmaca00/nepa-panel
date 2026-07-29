// Madde 5: Bu Ay Beklenen Gelir kartı — EUR karşılığı + tahsilat progress bar
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function RevenueProgressCard({
  expectedTRY = 0,
  expectedEUR = 0,
  collectedTRY = 0,
  collectedEUR = 0,
  exchangeRate = 38,
}) {
  // EUR karşılığı (TRY → EUR ya da tersi)
  const expectedTotalInTRY = expectedTRY + (expectedEUR * exchangeRate);
  const expectedTotalInEUR = expectedTRY / exchangeRate + expectedEUR;
  const collectedTotalInTRY = collectedTRY + (collectedEUR * exchangeRate);

  const progress = expectedTotalInTRY > 0
    ? Math.min(100, Math.round((collectedTotalInTRY / expectedTotalInTRY) * 100))
    : 0;

  return (
    <Card className="md:col-span-2">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gold" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Bu Ay Beklenen Gelir</div>
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(expectedTRY, "TRY")}</div>
              {expectedEUR > 0 && (
                <div className="text-xs text-muted-foreground">+ {formatCurrency(expectedEUR, "EUR")}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">EUR Karşılığı</div>
            <div className="text-sm font-semibold">~ {formatCurrency(expectedTotalInEUR, "EUR")}</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tahsil edilen / Beklenen</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(collectedTotalInTRY, "TRY")} / {formatCurrency(expectedTotalInTRY, "TRY")}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-right">
            <span className={`font-semibold ${progress >= 80 ? "text-emerald-600" : progress >= 40 ? "text-amber-600" : "text-red-600"}`}>
              %{progress}
            </span>
            <span className="text-muted-foreground"> tamamlandı</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}