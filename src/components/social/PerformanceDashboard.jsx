import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, Radar
} from "recharts";
import { TrendingUp, TrendingDown, BarChart2, Users, Heart, Share2, Eye } from "lucide-react";
import { PLATFORM_LABELS } from "@/lib/format";
import { format, subDays, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const STATUS_COLORS = {
  published: "#10b981",
  ready: "#3b82f6",
  in_progress: "#f59e0b",
  not_started: "#94a3b8",
};

const PLATFORM_COLORS = {
  instagram_post: "#e1306c",
  instagram_reels: "#c13584",
  instagram_story: "#833ab4",
  tiktok: "#010101",
  linkedin: "#0a66c2",
  facebook: "#1877f2",
  twitter: "#1da1f2",
};

function KpiCard({ label, value, sub, trend, icon: IconComp, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            {IconComp && <IconComp className="w-5 h-5 text-muted-foreground" />}
            {trend !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformanceDashboard({ companyId }) {
  const [range, setRange] = useState("30"); // gün

  const { data: ideas = [] } = useQuery({
    queryKey: ["perf-ideas", companyId],
    queryFn: () => base44.entities.ContentIdea.filter({ company_id: companyId, deleted: false }, "-scheduled_date", 500),
    enabled: !!companyId,
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["competitor-reports", companyId],
    queryFn: () => base44.entities.CompetitorReport.filter({ company_id: companyId, status: "completed" }, "-created_date", 5),
    enabled: !!companyId,
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const cutoff = useMemo(() => subDays(new Date(), parseInt(range)), [range]);

  // Zaman içindeki içerik üretim hızı (haftalık)
  const weeklyData = useMemo(() => {
    const weeks = {};
    ideas.forEach(idea => {
      if (!idea.scheduled_date) return;
      const d = parseISO(idea.scheduled_date);
      if (d < cutoff) return;
      const weekKey = format(d, "w. hafta", { locale: tr });
      if (!weeks[weekKey]) weeks[weekKey] = { hafta: weekKey, toplam: 0, yayınlanan: 0, hazır: 0, devam: 0 };
      weeks[weekKey].toplam++;
      if (idea.work_status === "published") weeks[weekKey].yayınlanan++;
      else if (idea.work_status === "ready") weeks[weekKey].hazır++;
      else if (idea.work_status === "in_progress") weeks[weekKey].devam++;
    });
    return Object.values(weeks).slice(-8);
  }, [ideas, cutoff]);

  // Platform dağılımı
  const platformData = useMemo(() => {
    const map = {};
    ideas.filter(i => {
      if (!i.scheduled_date) return false;
      return parseISO(i.scheduled_date) >= cutoff;
    }).forEach(i => {
      const p = i.platform || "other";
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([platform, count]) => ({
      platform: PLATFORM_LABELS[platform] || platform,
      count,
      fill: PLATFORM_COLORS[platform] || "#94a3b8",
    }));
  }, [ideas, cutoff]);

  // Onay durumu dağılımı
  const approvalData = useMemo(() => {
    const filtered = ideas.filter(i => {
      if (!i.scheduled_date) return false;
      return parseISO(i.scheduled_date) >= cutoff;
    });
    const approved = filtered.filter(i => ["approved", "client_approved"].includes(i.approval_status)).length;
    const pending = filtered.filter(i => ["pending_internal", "sent_to_client"].includes(i.approval_status)).length;
    const revision = filtered.filter(i => i.approval_status === "revision_requested").length;
    return [
      { name: "Onaylandı", value: approved, fill: "#10b981" },
      { name: "Bekliyor", value: pending, fill: "#f59e0b" },
      { name: "Revizyon", value: revision, fill: "#ef4444" },
    ];
  }, [ideas, cutoff]);

  // Rakip karşılaştırma radar
  const radarData = useMemo(() => {
    const latestReport = reports[0];
    if (!latestReport) return [];
    const myPublished = ideas.filter(i => i.work_status === "published").length;
    const myPerWeek = Math.round(myPublished / Math.max(parseInt(range) / 7, 1) * 10) / 10;

    const competitorRows = (latestReport.competitors_analyzed || []).slice(0, 3).map(c => ({
      competitor: c.name || c.handle,
      "Haftalık Post": c.posts_per_week || 0,
      "İçerik Çeşitliliği": (c.content_types || []).length * 10,
      "Hashtag Kullanımı": Math.min((c.top_hashtags || []).length * 5, 100),
    }));

    return [
      {
        competitor: "Sen",
        "Haftalık Post": myPerWeek * 10,
        "İçerik Çeşitliliği": [...new Set(ideas.map(i => i.platform))].length * 12,
        "Hashtag Kullanımı": Math.min(ideas.filter(i => (i.hashtags || []).length > 0).length * 3, 100),
      },
      ...competitorRows,
    ];
  }, [reports, ideas, range]);

  // KPI hesaplama
  const kpis = useMemo(() => {
    const inRange = ideas.filter(i => i.scheduled_date && parseISO(i.scheduled_date) >= cutoff);
    const published = inRange.filter(i => i.work_status === "published");
    const withHashtags = inRange.filter(i => (i.hashtags || []).length > 5);
    const approvalRate = inRange.length > 0
      ? Math.round(inRange.filter(i => ["approved", "client_approved"].includes(i.approval_status)).length / inRange.length * 100)
      : 0;

    return {
      total: inRange.length,
      published: published.length,
      publishRate: inRange.length > 0 ? Math.round(published.length / inRange.length * 100) : 0,
      approvalRate,
      hashtagRate: inRange.length > 0 ? Math.round(withHashtags.length / inRange.length * 100) : 0,
      perWeek: Math.round(inRange.length / Math.max(parseInt(range) / 7, 1) * 10) / 10,
    };
  }, [ideas, cutoff, range]);

  const latestReport = reports[0];

  if (!companyId) return (
    <div className="py-16 text-center text-muted-foreground text-sm">
      Firma seçin
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Başlık + filtre */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-muted-foreground" /> Performans & Karşılaştırma
        </h3>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Son 7 gün</SelectItem>
            <SelectItem value="14">Son 14 gün</SelectItem>
            <SelectItem value="30">Son 30 gün</SelectItem>
            <SelectItem value="90">Son 90 gün</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Toplam İçerik" value={kpis.total} sub={`${kpis.perWeek}/hafta`} icon={Eye} />
        <KpiCard label="Yayınlanan" value={kpis.published} sub={`%${kpis.publishRate} oran`} icon={Share2} color="text-emerald-600" />
        <KpiCard label="Onay Oranı" value={`%${kpis.approvalRate}`} sub="onaylanan/toplam" icon={Heart} color="text-blue-600" />
        <KpiCard label="Hashtag Kalitesi" value={`%${kpis.hashtagRate}`} sub="5+ hashtag kullanan" icon={Users} color="text-purple-600" />
      </div>

      {/* Haftalık içerik üretim trendi */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Haftalık İçerik Üretim Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Bu dönemde veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="gradY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hafta" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="toplam" name="Toplam" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="yayınlanan" name="Yayınlanan" stroke="#10b981" fill="url(#gradY)" strokeWidth={2} />
                <Area type="monotone" dataKey="hazır" name="Hazır" stroke="#3b82f6" fill="url(#gradH)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Platform dağılımı */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Platform Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {platformData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="platform" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="İçerik" radius={[0, 4, 4, 0]}>
                    {platformData.map((entry, index) => (
                      <rect key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Rakip karşılaştırma radar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Rakip Karşılaştırma</CardTitle>
              {!latestReport && (
                <Badge variant="outline" className="text-[10px]">Rakip raporu yok</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {radarData.length <= 1 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Karşılaştırma için rakip analizi çalıştırın
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={[
                  { metric: "Haftalık Post", ...Object.fromEntries(radarData.map(r => [r.competitor, r["Haftalık Post"]])) },
                  { metric: "İçerik Çeş.", ...Object.fromEntries(radarData.map(r => [r.competitor, r["İçerik Çeşitliliği"]])) },
                  { metric: "Hashtag", ...Object.fromEntries(radarData.map(r => [r.competitor, r["Hashtag Kullanımı"]])) },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                  {radarData.map((r, i) => (
                    <Radar
                      key={r.competitor}
                      name={r.competitor}
                      dataKey={r.competitor}
                      stroke={i === 0 ? "#6366f1" : ["#f59e0b", "#10b981", "#ef4444"][i - 1]}
                      fill={i === 0 ? "#6366f1" : ["#f59e0b", "#10b981", "#ef4444"][i - 1]}
                      fillOpacity={i === 0 ? 0.25 : 0.1}
                    />
                  ))}
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rakip haftalık post karşılaştırması */}
      {latestReport && (latestReport.competitors_analyzed || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Haftalık Paylaşım Frekansı — Sen vs Rakipler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Senin verini */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold w-28 shrink-0 text-purple-700">Sen</span>
                <div className="flex-1 bg-purple-100 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.min(kpis.perWeek * 15, 100)}%` }}
                  >
                    <span className="text-[10px] text-white font-bold">{kpis.perWeek}/h</span>
                  </div>
                </div>
              </div>
              {(latestReport.competitors_analyzed || []).slice(0, 4).map((c, i) => {
                const colors = ["bg-amber-500", "bg-emerald-500", "bg-blue-500", "bg-rose-500"];
                const bgs = ["bg-amber-100", "bg-emerald-100", "bg-blue-100", "bg-rose-100"];
                const ppw = c.posts_per_week || 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-28 shrink-0 truncate text-muted-foreground">{c.name || c.handle}</span>
                    <div className={`flex-1 ${bgs[i]} rounded-full h-5 relative overflow-hidden`}>
                      <div
                        className={`h-full ${colors[i]} rounded-full flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${Math.min(ppw * 15, 100)}%` }}
                      >
                        <span className="text-[10px] text-white font-bold">{ppw}/h</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}