import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, RefreshCw } from "lucide-react";
import { PLATFORM_LABELS, getStatusColor, getStatusLabel, todayISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "@/lib/format";
import { toast } from "sonner";

function ProgressRow({ label, current, target }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 999) : 0;
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-gold" : pct >= 40 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{current}/{target} <span className="text-xs">({pct}%)</span></span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function TabTargets({ company }) {
  const queryClient = useQueryClient();
  const monthlyTargets = company.monthly_targets || {};
  const weeklyTargets = company.weekly_targets || {};

  const { data: ideas = [] } = useQuery({
    queryKey: ["ideas-target", company.id],
    queryFn: () => base44.entities.ContentIdea.filter({ company_id: company.id }, "-scheduled_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ["recurring-target", company.id],
    queryFn: () => base44.entities.RecurringContentInstance.filter({ company_id: company.id }, "-target_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const monthlyAchieved = useMemo(() => {
    const start = startOfMonth().toISOString().split("T")[0];
    const end = endOfMonth().toISOString().split("T")[0];
    const monthIdeas = ideas.filter(i => i.work_status === "published" && i.scheduled_date >= start && i.scheduled_date <= end);
    const counts = {};
    monthIdeas.forEach(i => {
      const key = i.platform;
      counts[key] = (counts[key] || 0) + 1;
    });
    if (company.recurring_counts_toward_target) {
      const monthRecurring = recurring.filter(r => r.status === "done" && r.target_date >= start && r.target_date <= end);
      counts.instagram_post = (counts.instagram_post || 0) + monthRecurring.length;
    }
    return counts;
  }, [ideas, recurring, company.recurring_counts_toward_target]);

  const weeklyAchieved = useMemo(() => {
    const start = startOfWeek().toISOString().split("T")[0];
    const end = endOfWeek().toISOString().split("T")[0];
    const weekIdeas = ideas.filter(i => i.work_status === "published" && i.scheduled_date >= start && i.scheduled_date <= end);
    const counts = {};
    weekIdeas.forEach(i => {
      counts[i.platform] = (counts[i.platform] || 0) + 1;
    });
    return counts;
  }, [ideas]);

  const hasMonthlyTargets = Object.keys(monthlyTargets).length > 0;
  const hasWeeklyTargets = Object.keys(weeklyTargets).length > 0;

  if (!hasMonthlyTargets && !hasWeeklyTargets) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-2">Bu firma için hedef belirlenmedi.</p>
          <p className="text-xs">Ayarlar tabından hedefleri düzenleyebilirsin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {hasMonthlyTargets && (
        <Card>
          <CardHeader><CardTitle className="text-base">Bu Ay</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(monthlyTargets).map(([key, target]) => (
              <ProgressRow
                key={key}
                label={PLATFORM_LABELS[key] || key}
                current={monthlyAchieved[key] || 0}
                target={target}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {hasWeeklyTargets && (
        <Card>
          <CardHeader><CardTitle className="text-base">Bu Hafta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(weeklyTargets).map(([key, target]) => (
              <ProgressRow
                key={key}
                label={PLATFORM_LABELS[key] || key}
                current={weeklyAchieved[key] || 0}
                target={target}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}