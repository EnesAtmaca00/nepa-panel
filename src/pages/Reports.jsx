import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, Receipt, Download, Sparkles } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import SectorAnalysisPanel from "@/components/reports/SectorAnalysisPanel";

const CHART_COLORS = ["#D4AF37", "#0F172A", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6", "#F59E0B"];

export default function Reports() {
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"], queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 500), initialData: [], initialDataUpdatedAt: 0,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-all"], queryFn: () => base44.entities.Invoice.filter({ deleted: false }, "-issue_date", 1000), initialData: [], initialDataUpdatedAt: 0,
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services"], queryFn: () => base44.entities.ServiceCatalog.list(), initialData: [], initialDataUpdatedAt: 0,
  });
  const { data: ideas = [] } = useQuery({
    queryKey: ["all-ideas"], queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-scheduled_date", 1000), initialData: [], initialDataUpdatedAt: 0,
  });
  const { data: recurring = [] } = useQuery({
    queryKey: ["all-recurring"], queryFn: () => base44.entities.RecurringContentInstance.list("-target_date", 500), initialData: [], initialDataUpdatedAt: 0,
  });

  // Aylık gelir (son 6 ay)
  const monthlyRevenue = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ month: d.toLocaleDateString("tr-TR", { month: "short" }), key: m, TRY: 0, EUR: 0 });
    }
    invoices.filter(i => i.status === "paid").forEach(i => {
      const k = (i.paid_date || i.issue_date || "").slice(0, 7);
      const row = months.find(x => x.key === k);
      if (row) row[i.currency || "TRY"] += i.amount || 0;
    });
    return months;
  }, [invoices]);

  // Müşteri başına gelir
  const revByCompany = useMemo(() => {
    const map = {};
    invoices.filter(i => i.status === "paid").forEach(i => {
      if (!map[i.company_id]) map[i.company_id] = { name: i.company_name, value: 0 };
      map[i.company_id].value += i.amount || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [invoices]);

  // Hizmet türü dağılımı
  const serviceDist = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      (c.agreed_services || []).forEach(sid => {
        const s = services.find(x => x.id === sid);
        const name = s?.name || "Diğer";
        map[name] = (map[name] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [companies, services]);

  // Tahsilat oranı
  const collectionRate = useMemo(() => {
    const total = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  }, [invoices]);

  const stats = useMemo(() => {
    const recurringDone = recurring.filter(r => r.status === "done").length;
    const recurringTotal = recurring.length;
    return {
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.status === "active").length,
      totalInvoices: invoices.length,
      ideasGenerated: ideas.length,
      ideasPublished: ideas.filter(i => i.work_status === "published").length,
      recurringRate: recurringTotal > 0 ? Math.round((recurringDone / recurringTotal) * 100) : 0,
    };
  }, [companies, invoices, ideas, recurring]);

  const exportCSV = () => {
    const rows = [["Şirket", "Para Birimi", "Aylık Ücret", "Toplam Tahsilat", "Açık Borç", "Durum"]];
    companies.forEach(c => {
      const cInv = invoices.filter(i => i.company_id === c.id);
      const paid = cInv.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
      const open = cInv.filter(i => i.status !== "paid").reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);
      rows.push([c.name, c.currency, c.monthly_fee, paid, open, c.status]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ajanspro-rapor-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raporlar</h1>
          <p className="text-muted-foreground text-sm mt-1">Performans ve finans özeti</p>
        </div>
        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" /> CSV İndir
        </Button>
      </div>

      <Tabs defaultValue="genel">
        <TabsList>
          <TabsTrigger value="genel">Genel</TabsTrigger>
          <TabsTrigger value="sektor" className="gap-1"><Sparkles className="w-3.5 h-3.5" /> Sektör Analizi</TabsTrigger>
        </TabsList>

        <TabsContent value="sektor" className="mt-4">
          <SectorAnalysisPanel />
        </TabsContent>

        <TabsContent value="genel" className="mt-4 space-y-6">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Users className="w-3 h-3" /> Müşteri</div>
          <div className="text-2xl font-bold mt-1">{stats.activeCompanies}<span className="text-sm text-muted-foreground">/{stats.totalCompanies}</span></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Receipt className="w-3 h-3" /> Tahsilat</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">%{collectionRate}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><BarChart3 className="w-3 h-3" /> İçerik</div>
          <div className="text-2xl font-bold mt-1">{stats.ideasPublished}<span className="text-sm text-muted-foreground">/{stats.ideasGenerated}</span></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Tekrarlayanlar</div>
          <div className="text-2xl font-bold mt-1 text-gold">%{stats.recurringRate}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Aylık Gelir (Son 6 Ay)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v, n) => formatCurrency(v, n)} />
              <Legend />
              <Bar dataKey="TRY" fill="#D4AF37" name="₺ TRY" radius={[8, 8, 0, 0]} />
              <Bar dataKey="EUR" fill="#0F172A" name="€ EUR" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">En Kazançlı 5 Müşteri</CardTitle></CardHeader>
          <CardContent>
            {revByCompany.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Henüz tahsilat yok.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revByCompany} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(v) => v.toLocaleString("tr-TR")} />
                  <Bar dataKey="value" fill="#D4AF37" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Hizmet Dağılımı</CardTitle></CardHeader>
          <CardContent>
            {serviceDist.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Hizmet eşleşmesi yok.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={serviceDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {serviceDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}