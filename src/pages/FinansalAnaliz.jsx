import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, CreditCard, Calendar, Users } from "lucide-react";

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const COLORS = ["hsl(217,91%,50%)", "hsl(142,65%,38%)", "hsl(38,92%,45%)", "hsl(0,70%,50%)", "hsl(280,35%,50%)"];

function KpiCard({ title, value, sub, icon: Icon, trend, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-destructive"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend >= 0 ? "+" : ""}{trend}% geçen aya göre
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value, currency || "TRY")}
        </p>
      ))}
    </div>
  );
};

export default function FinansalAnaliz() {
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-all"],
    queryFn: () => base44.entities.Invoice.filter({ deleted: false }, "-issue_date", 500),
  });

  const now = new Date();

  const stats = useMemo(() => {
    const activeCompanies = companies.filter(c => c.status === "active");

    // MRR — aktif müşterilerin aylık ücretleri (TRY bazlı, EUR x40 dönüşüm)
    const mrrTRY = activeCompanies.reduce((sum, c) => {
      const fee = c.monthly_fee || 0;
      return sum + (c.currency === "EUR" ? fee * 40 : fee);
    }, 0);

    const mrrEUR = activeCompanies.reduce((sum, c) => {
      const fee = c.monthly_fee || 0;
      return sum + (c.currency === "EUR" ? fee : fee / 40);
    }, 0);

    // Ödenmemiş faturalar
    const unpaid = invoices.filter(i => i.status === "pending" || i.status === "overdue");
    const unpaidTRY = unpaid.reduce((s, i) => s + (i.currency === "EUR" ? (i.total_amount || i.amount || 0) * 40 : (i.total_amount || i.amount || 0)), 0);
    const overdueTRY = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + (i.currency === "EUR" ? (i.total_amount || i.amount || 0) * 40 : (i.total_amount || i.amount || 0)), 0);

    // Son 6 ay fatura tahsilatı
    const monthlyData = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const label = MONTHS_TR[d.getMonth()] + " " + d.getFullYear();
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthInvoices = invoices.filter(i => (i.issue_date || "").startsWith(monthStr));
      const collected = monthInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.currency === "EUR" ? (i.total_amount || i.amount || 0) * 40 : (i.total_amount || i.amount || 0)), 0);
      const billed = monthInvoices.reduce((s, i) => s + (i.currency === "EUR" ? (i.total_amount || i.amount || 0) * 40 : (i.total_amount || i.amount || 0)), 0);
      monthlyData.push({ label, collected, billed, pending: billed - collected });
    }

    // Tahmini gelecek ay geliri = aktif müşterilerin aylık ücreti (MRR)
    const nextMonthEstimate = mrrTRY;

    // Bu ay vs geçen ay tahsilat trendi
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonthD.getFullYear()}-${String(lastMonthD.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthCollected = invoices.filter(i => i.status === "paid" && (i.issue_date || "").startsWith(thisMonthStr))
      .reduce((s, i) => s + (i.currency === "EUR" ? (i.total_amount || i.amount || 0) * 40 : (i.total_amount || i.amount || 0)), 0);
    const lastMonthCollected = invoices.filter(i => i.status === "paid" && (i.issue_date || "").startsWith(lastMonthStr))
      .reduce((s, i) => s + (i.currency === "EUR" ? (i.total_amount || i.amount || 0) * 40 : (i.total_amount || i.amount || 0)), 0);
    const trend = lastMonthCollected > 0 ? Math.round(((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100) : null;

    // Müşteri başına gelir dağılımı (top 8)
    const clientRevenue = activeCompanies
      .map(c => ({ name: c.name, value: c.currency === "EUR" ? (c.monthly_fee || 0) * 40 : (c.monthly_fee || 0) }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Ödeme durumu pasta
    const statusDist = [
      { name: "Ödendi", value: invoices.filter(i => i.status === "paid").length },
      { name: "Bekliyor", value: invoices.filter(i => i.status === "pending").length },
      { name: "Gecikti", value: invoices.filter(i => i.status === "overdue").length },
      { name: "Kısmi", value: invoices.filter(i => i.status === "partial").length },
    ].filter(s => s.value > 0);

    return { mrrTRY, mrrEUR, unpaidTRY, overdueTRY, monthlyData, nextMonthEstimate, trend, clientRevenue, statusDist, activeCount: activeCompanies.length };
  }, [companies, invoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-accent" />
          Finansal Analiz
        </h1>
        <p className="text-muted-foreground text-sm mt-1">MRR, tahsilat ve fatura performansı</p>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Aylık Tekrarlayan Gelir (MRR)"
          value={formatCurrency(stats.mrrTRY, "TRY")}
          sub={`${stats.activeCount} aktif müşteri`}
          icon={TrendingUp}
          color="text-green-600"
        />
        <KpiCard
          title="Tahmini Gelecek Ay"
          value={formatCurrency(stats.nextMonthEstimate, "TRY")}
          sub="Aktif sözleşme bazlı"
          icon={Calendar}
        />
        <KpiCard
          title="Ödenmemiş Faturalar"
          value={formatCurrency(stats.unpaidTRY, "TRY")}
          sub="Bekleyen + geciken"
          icon={CreditCard}
          color={stats.unpaidTRY > 0 ? "text-amber-600" : "text-foreground"}
        />
        <KpiCard
          title="Geciken Faturalar"
          value={formatCurrency(stats.overdueTRY, "TRY")}
          sub="Acil tahsilat gerekli"
          icon={AlertCircle}
          color={stats.overdueTRY > 0 ? "text-destructive" : "text-foreground"}
          trend={stats.trend}
        />
      </div>

      {/* Grafik Satırı 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Aylık Faturalanan vs Tahsil Edilen */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Son 6 Ay — Faturalanan & Tahsil Edilen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="billed" name="Faturalanan" fill="hsl(217,91%,70%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Tahsil Edilen" fill="hsl(142,65%,38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fatura Durum Dağılımı */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fatura Durum Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {stats.statusDist.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={stats.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {stats.statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v} fatura`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {stats.statusDist.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{s.name}: {s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-12 text-sm text-muted-foreground text-center">Fatura verisi yok</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grafik Satırı 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Müşteri Bazında Aylık Gelir */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Müşteri Bazında Aylık Gelir (TRY)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.clientRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.clientRevenue} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Aylık Gelir" fill="hsl(217,91%,50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-sm text-muted-foreground text-center">Aktif müşteri verisi yok</div>
            )}
          </CardContent>
        </Card>

        {/* Son 6 Ay Ödenmemiş Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Son 6 Ay — Bekleyen Alacak Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="pending" name="Bekleyen" stroke="hsl(38,92%,45%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Müşteri Gelir Tablosu */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" /> Müşteri Gelir Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Müşteri</th>
                  <th className="pb-2 pr-4 font-medium">Durum</th>
                  <th className="pb-2 pr-4 font-medium">Aylık Ücret</th>
                  <th className="pb-2 pr-4 font-medium">Para Birimi</th>
                  <th className="pb-2 font-medium">TRY Karşılığı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies
                  .filter(c => c.status === "active" && (c.monthly_fee || 0) > 0)
                  .sort((a, b) => (b.monthly_fee || 0) - (a.monthly_fee || 0))
                  .map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">{c.name}</td>
                      <td className="py-2.5 pr-4">
                        <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Aktif</Badge>
                      </td>
                      <td className="py-2.5 pr-4">{formatCurrency(c.monthly_fee, c.currency)}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{c.currency}</td>
                      <td className="py-2.5 font-medium">
                        {c.currency === "EUR"
                          ? formatCurrency((c.monthly_fee || 0) * 40, "TRY")
                          : formatCurrency(c.monthly_fee, "TRY")}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-bold text-sm">
                  <td colSpan={4} className="pt-3 text-muted-foreground">Toplam MRR</td>
                  <td className="pt-3 text-green-600">{formatCurrency(stats.mrrTRY, "TRY")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}