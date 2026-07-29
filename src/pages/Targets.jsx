import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, ArrowRight } from "lucide-react";
import { COUNTRY_FLAGS, PLATFORM_LABELS, getStatusColor, getStatusLabel, todayISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "@/lib/format";

function computeAchieved(ideas, recurring, periodStart, periodEnd, recurringCounts) {
  const inRange = ideas.filter(i =>
    i.work_status === "published" && i.scheduled_date >= periodStart && i.scheduled_date <= periodEnd
  );
  const counts = {};
  inRange.forEach(i => { counts[i.platform] = (counts[i.platform] || 0) + 1; });
  if (recurringCounts) {
    const r = recurring.filter(x => x.status === "done" && x.target_date >= periodStart && x.target_date <= periodEnd);
    counts.instagram_post = (counts.instagram_post || 0) + r.length;
  }
  return counts;
}

function statusOf(percentage) {
  if (percentage >= 120) return "exceeded";
  if (percentage >= 100) return "achieved";
  if (percentage >= 70) return "on_track";
  if (percentage >= 40) return "at_risk";
  return "behind";
}

export default function Targets() {
  const [periodType, setPeriodType] = useState("monthly");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ status: "active" }, "-created_date", 200),
    initialData: [],
  });

  const { data: ideas = [] } = useQuery({
    queryKey: ["ideas-all"],
    queryFn: () => base44.entities.ContentIdea.list("-scheduled_date", 1000),
    initialData: [],
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ["recurring-all"],
    queryFn: () => base44.entities.RecurringContentInstance.list("-target_date", 500),
    initialData: [],
  });

  const stats = useMemo(() => {
    const start = periodType === "monthly" ? startOfMonth().toISOString().split("T")[0] : startOfWeek().toISOString().split("T")[0];
    const end = periodType === "monthly" ? endOfMonth().toISOString().split("T")[0] : endOfWeek().toISOString().split("T")[0];

    return companies
      .filter(c => {
        const targets = periodType === "monthly" ? c.monthly_targets : c.weekly_targets;
        return targets && Object.keys(targets).length > 0;
      })
      .map(c => {
        const targets = periodType === "monthly" ? c.monthly_targets : c.weekly_targets;
        const cIdeas = ideas.filter(i => i.company_id === c.id);
        const cRecurring = recurring.filter(r => r.company_id === c.id);
        const achieved = computeAchieved(cIdeas, cRecurring, start, end, c.recurring_counts_toward_target);

        const totalTarget = Object.values(targets).reduce((a, b) => a + b, 0);
        const totalAchieved = Object.entries(targets).reduce((sum, [k]) => sum + (achieved[k] || 0), 0);
        const pct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
        return { company: c, targets, achieved, pct, status: statusOf(pct) };
      })
      .sort((a, b) => a.pct - b.pct);
  }, [companies, ideas, recurring, periodType]);

  const avgPct = stats.length > 0 ? Math.round(stats.reduce((s, x) => s + x.pct, 0) / stats.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hedefler & Performans</h1>
          <p className="text-muted-foreground text-sm mt-1">{stats.length} firmada hedef takibi aktif</p>
        </div>
        <Select value={periodType} onValueChange={setPeriodType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Aylık</SelectItem>
            <SelectItem value="weekly">Haftalık</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="navy-gradient text-white border-0">
        <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold mb-1">Genel Ortalama</div>
            <div className="text-4xl font-bold">%{avgPct}</div>
            <p className="text-sm text-white/70 mt-1">{periodType === "monthly" ? "Bu ay" : "Bu hafta"} aktif firmalar</p>
          </div>
          <Target className="w-16 h-16 text-gold opacity-50" />
        </CardContent>
      </Card>

      {stats.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Hedef tanımlı firma yok.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {stats.map(({ company, targets, achieved, pct, status }) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                      {company.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold">{company.name}</h3>
                      <span>{COUNTRY_FLAGS[company.country]}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                  <div className="text-right">
                    <div className="text-2xl font-bold">%{pct}</div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/musteriler/${company.id}`}>
                      Detay <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>

                <div className="space-y-2">
                  {Object.entries(targets).map(([key, target]) => {
                    const cur = achieved[key] || 0;
                    const p = target > 0 ? Math.min(Math.round((cur / target) * 100), 999) : 0;
                    const color = p >= 100 ? "bg-emerald-500" : p >= 70 ? "bg-gold" : p >= 40 ? "bg-orange-500" : "bg-red-500";
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-muted-foreground truncate">{PLATFORM_LABELS[key] || key}</div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${Math.min(p, 100)}%` }} />
                        </div>
                        <div className="text-xs font-medium w-16 text-right">{cur}/{target}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}