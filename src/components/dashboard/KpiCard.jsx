import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const ACCENT_BG = {
  gold: "bg-gold/10 text-gold",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function KpiCard({ title, value, icon: Icon, accent = "gold" }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight break-words min-w-0">{title}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ACCENT_BG[accent] || ACCENT_BG.gold}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight break-words">
          {typeof value === "string" || typeof value === "number" ? value : value}
        </div>
      </CardContent>
    </Card>
  );
}