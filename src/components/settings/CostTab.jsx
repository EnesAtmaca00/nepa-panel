import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, Zap, Database } from "lucide-react";

const TASK_LABELS = {
  caption_translate: "Çeviri",
  hashtag: "Hashtag",
  content_idea: "İçerik Fikri",
  image_prompt: "Görsel Prompt",
  chat_simple: "Sohbet (Basit)",
  chat_complex: "Sohbet (Derin)",
  vision: "Görsel Analiz",
  monthly_report: "Aylık Rapor",
};

export default function CostTab({ monthlyBudget = 20 }) {
  const { data: cacheItems = [] } = useQuery({
    queryKey: ["ai-cache-all"],
    queryFn: () => base44.entities.AICache.list("-created_date", 2000),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = useMemo(() => {
    const thisMonth = cacheItems.filter(c => new Date(c.created_date) >= monthStart);
    const hits = thisMonth.filter(c => (c.hit_count || 0) > 0);
    const totalCost = thisMonth.reduce((s, c) => s + (c.estimated_cost_usd || 0), 0);
    const cachedSavings = hits.reduce((s, c) => s + ((c.estimated_cost_usd || 0) * (c.hit_count || 0)), 0);

    const byTask = {};
    thisMonth.forEach(c => {
      const t = c.task_type || "other";
      if (!byTask[t]) byTask[t] = { task: TASK_LABELS[t] || t, cost: 0, count: 0 };
      byTask[t].cost += c.estimated_cost_usd || 0;
      byTask[t].count++;
    });

    const top10 = [...thisMonth].sort((a, b) => (b.estimated_cost_usd || 0) - (a.estimated_cost_usd || 0)).slice(0, 10);

    return {
      totalCost,
      cachedSavings,
      hitRate: thisMonth.length > 0 ? Math.round((hits.length / thisMonth.length) * 100) : 0,
      byTask: Object.values(byTask).sort((a, b) => b.cost - a.cost),
      top10,
      callCount: thisMonth.length,
    };
  }, [cacheItems]);

  const budgetPct = monthlyBudget > 0 ? Math.min(100, Math.round((stats.totalCost / monthlyBudget) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Bu Ay Maliyet</div>
          <div className="text-2xl font-bold mt-1">${stats.totalCost.toFixed(4)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Cache Tasarrufu</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">${stats.cachedSavings.toFixed(4)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Database className="w-3 h-3" /> Cache Hit Oranı</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">%{stats.hitRate}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Toplam Çağrı</div>
          <div className="text-2xl font-bold mt-1">{stats.callCount}</div>
        </CardContent></Card>
      </div>

      {monthlyBudget > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Aylık Bütçe Kullanımı</span>
              <span className={budgetPct > 90 ? "text-destructive font-bold" : "text-muted-foreground"}>
                ${stats.totalCost.toFixed(4)} / ${monthlyBudget}
              </span>
            </div>
            <Progress value={budgetPct} className="h-2" />
            <p className="text-xs text-muted-foreground">%{budgetPct} kullanıldı</p>
          </CardContent>
        </Card>
      )}

      {stats.byTask.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Görev Tipine Göre Maliyet</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byTask} layout="vertical">
                <XAxis type="number" tickFormatter={v => `$${v.toFixed(4)}`} style={{ fontSize: 10 }} />
                <YAxis dataKey="task" type="category" width={100} style={{ fontSize: 10 }} />
                <Tooltip formatter={v => `$${Number(v).toFixed(6)}`} />
                <Bar dataKey="cost" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {stats.top10.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">En Pahalı 10 Çağrı</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stats.top10.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 text-xs p-2 rounded-md hover:bg-muted/50">
                  <span className="text-muted-foreground w-4">{i + 1}.</span>
                  <span className="flex-1 truncate text-muted-foreground font-mono">{c.prompt_signature?.slice(0, 60)}...</span>
                  <span className="text-xs">{TASK_LABELS[c.task_type] || c.task_type}</span>
                  <span className="font-medium text-destructive">${(c.estimated_cost_usd || 0).toFixed(6)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}