import React, { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { anomaliDedektoru } from "@/lib/anomalyDetector";
import { dovizKuruGuncelle } from "@/lib/intelligenceLayer";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, TrendingUp, AlertCircle, CheckCircle2, Target,
  Plus, Calendar, Repeat, Receipt, ArrowRight, Sparkles, ShieldCheck, Send, Zap, Mail, CreditCard
} from "lucide-react";
import {
  formatCurrency, formatDate, getStatusColor, getStatusLabel,
  diffDays, todayISO, startOfMonth, endOfMonth
} from "@/lib/format";
import KpiCard from "@/components/dashboard/KpiCard";
import RecurringWeekPanel from "@/components/dashboard/RecurringWeekPanel";
import InboxSummaryWidget from "@/components/dashboard/InboxSummaryWidget";
import WebProjectsWidget from "@/components/dashboard/WebProjectsWidget";
import AttentionWidget from "@/components/dashboard/AttentionWidget";
import OverdueBanner from "@/components/dashboard/OverdueBanner";
import NoContentCompanies from "@/components/dashboard/NoContentCompanies";
import RevenueProgressCard from "@/components/dashboard/RevenueProgressCard";
import { useDashboardLayout, DashboardEditBar, WidgetWrapper } from "@/components/dashboard/DashboardWidgets";

export default function Dashboard() {
  const { layout, editMode, setEditMode, removeWidget, addWidget, resetLayout, allWidgets } = useDashboardLayout();
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "-created_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-issue_date", 500),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["targets"],
    queryFn: () => base44.entities.TargetTracking.list("-period_start", 100),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-dashboard"],
    queryFn: () => base44.entities.Expense.filter({ deleted_at: null }, "-payment_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: pendingIdeas = [] } = useQuery({
    queryKey: ["dashboard-pending-internal"],
    queryFn: () => base44.entities.ContentIdea.filter({ approval_mode: "manual_internal", approval_status: "pending_internal" }, "-created_date", 5),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  // KATMAN 4C: Anomali dedektörü + KATMAN 3A: Döviz kuru güncelleme (sayfa açılınca bir kez)
  useEffect(() => {
    if (companies.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const settingsList = await base44.entities.AppSettings.list();
        const settings = settingsList?.[0];
        if (cancelled || !settings) return;
        // Paralel: kur güncelle + anomali dedektörü
        await Promise.all([
          dovizKuruGuncelle(settings),
          anomaliDedektoru({ firmalar: companies, faturalar: invoices, settings }),
        ]);
      } catch (e) {
        console.warn("Dashboard arka plan görevleri hata:", e?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [companies.length, invoices.length]);

  const { data: clientPending = [] } = useQuery({
    queryKey: ["dashboard-client-approvals"],
    queryFn: () => base44.entities.ClientApproval.filter({ status: "pending" }, "-sent_at", 5),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const stats = useMemo(() => {
    const active = companies.filter(c => c.status === "active");
    const monthStart = startOfMonth().toISOString().split("T")[0];
    const monthEnd = endOfMonth().toISOString().split("T")[0];

    const expectedTRY = active.filter(c => c.currency === "TRY")
      .reduce((s, c) => s + (c.monthly_fee || 0), 0);
    const expectedEUR = active.filter(c => c.currency === "EUR")
      .reduce((s, c) => s + (c.monthly_fee || 0), 0);

    const openDebtTRY = invoices.filter(i => (i.status === "pending" || i.status === "overdue" || i.status === "partial") && i.currency === "TRY")
      .reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);
    const openDebtEUR = invoices.filter(i => (i.status === "pending" || i.status === "overdue" || i.status === "partial") && i.currency === "EUR")
      .reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);

    const collectedTRY = invoices.filter(i => i.paid_date >= monthStart && i.paid_date <= monthEnd && i.currency === "TRY")
      .reduce((s, i) => s + (i.paid_amount || 0), 0);
    const collectedEUR = invoices.filter(i => i.paid_date >= monthStart && i.paid_date <= monthEnd && i.currency === "EUR")
      .reduce((s, i) => s + (i.paid_amount || 0), 0);

    const monthlyTargets = targets.filter(t => t.period_type === "monthly" && t.period_start <= todayISO() && t.period_end >= todayISO());
    const avgCompletion = monthlyTargets.length
      ? Math.round(monthlyTargets.reduce((s, t) => s + (t.completion_percentage || 0), 0) / monthlyTargets.length)
      : 0;

    const thisMonthExpenses = expenses
      .filter(e => e.payment_date >= monthStart && e.payment_date <= monthEnd)
      .reduce((s, e) => s + (e.amount || 0), 0);

    return {
      activeCount: active.length,
      expectedTRY, expectedEUR,
      openDebtTRY, openDebtEUR,
      collectedTRY, collectedEUR,
      avgCompletion,
      thisMonthExpenses,
    };
  }, [companies, invoices, targets, expenses]);

  const upcomingInvoices = useMemo(() => {
    return invoices
      .filter(i => i.status === "pending" && diffDays(i.due_date) >= 0 && diffDays(i.due_date) <= 7)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
  }, [invoices]);

  const overdueInvoices = useMemo(() => {
    return invoices
      .filter(i => i.status === "overdue" || (i.status === "pending" && diffDays(i.due_date) < 0))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
  }, [invoices]);

  const targetsBehind = useMemo(() => {
    return targets
      .filter(t => t.period_type === "monthly" && t.status === "behind" && t.period_start <= todayISO() && t.period_end >= todayISO())
      .slice(0, 5);
  }, [targets]);

  const settingsListData = useQuery({
    queryKey: ["app-settings-dashboard"],
    queryFn: () => base44.entities.AppSettings.list(),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });
  const exchangeRate = settingsListData.data?.[0]?.exchange_rate_eur_try || 38;

  return (
    <div className="space-y-6">
      {/* Madde 4: Overdue fatura hero banner */}
      <OverdueBanner />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            {formatDate(new Date())}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 md:flex-wrap scrollbar-thin">
          <Button asChild className="gap-1.5 shrink-0 h-8 text-xs md:h-9 md:text-sm">
            <Link to="/musteriler/yeni"><Plus className="w-3.5 h-3.5" /> Yeni Müşteri</Link>
          </Button>
          <Button variant="outline" asChild className="gap-1.5 shrink-0 h-8 text-xs md:h-9 md:text-sm">
            <Link to="/faturalar"><Receipt className="w-3.5 h-3.5" /> Faturalar</Link>
          </Button>
          <Button variant="outline" asChild className="gap-1.5 shrink-0 h-8 text-xs md:h-9 md:text-sm">
            <Link to="/anlik-planlama"><Zap className="w-3.5 h-3.5" /> Anlık Plan</Link>
          </Button>
        </div>
      </div>

      {/* Widget düzenleme barı */}
      <DashboardEditBar
        editMode={editMode}
        setEditMode={setEditMode}
        layout={layout}
        removeWidget={removeWidget}
        addWidget={addWidget}
        resetLayout={resetLayout}
        allWidgets={allWidgets}
      />

      {/* KPI Cards */}
      {(layout.includes("kpi_clients") || layout.includes("kpi_revenue") || layout.includes("kpi_debt") || layout.includes("kpi_targets") || layout.includes("kpi_expenses")) && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {layout.includes("kpi_clients") && (
            <WidgetWrapper id="kpi_clients" editMode={editMode} onRemove={removeWidget}>
              <KpiCard title="Aktif Müşteri" value={stats.activeCount} icon={Users} accent="blue" />
            </WidgetWrapper>
          )}
          {layout.includes("kpi_revenue") && (
            <WidgetWrapper id="kpi_revenue" editMode={editMode} onRemove={removeWidget}>
              <KpiCard title="Bu Ay Beklenen Gelir" value={
                <div className="space-y-0.5">
                  <div className="text-lg font-bold">{formatCurrency(stats.expectedTRY, "TRY")}</div>
                  {stats.expectedEUR > 0 && <div className="text-sm text-muted-foreground">{formatCurrency(stats.expectedEUR, "EUR")}</div>}
                </div>
              } icon={TrendingUp} accent="gold" />
            </WidgetWrapper>
          )}
          {layout.includes("kpi_debt") && (
            <WidgetWrapper id="kpi_debt" editMode={editMode} onRemove={removeWidget}>
              <KpiCard title="Açık Borç" value={
                <div className="space-y-0.5">
                  <div className="text-lg font-bold">{formatCurrency(stats.openDebtTRY, "TRY")}</div>
                  {stats.openDebtEUR > 0 && <div className="text-sm text-muted-foreground">{formatCurrency(stats.openDebtEUR, "EUR")}</div>}
                </div>
              } icon={AlertCircle} accent="red" />
            </WidgetWrapper>
          )}
          <WidgetWrapper id="kpi_collected" editMode={editMode} onRemove={removeWidget}>
            <KpiCard title="Bu Ay Tahsil Edilen" value={
              <div className="space-y-0.5">
                <div className="text-lg font-bold">{formatCurrency(stats.collectedTRY, "TRY")}</div>
                {stats.collectedEUR > 0 && <div className="text-sm text-muted-foreground">{formatCurrency(stats.collectedEUR, "EUR")}</div>}
              </div>
            } icon={CheckCircle2} accent="green" />
          </WidgetWrapper>
          {layout.includes("kpi_targets") && (
            <WidgetWrapper id="kpi_targets" editMode={editMode} onRemove={removeWidget}>
              <KpiCard title="Hedef Tutturma" value={`%${stats.avgCompletion}`} icon={Target} accent={stats.avgCompletion >= 70 ? "green" : "red"} />
            </WidgetWrapper>
          )}
          {layout.includes("kpi_expenses") && (
            <WidgetWrapper id="kpi_expenses" editMode={editMode} onRemove={removeWidget}>
              <KpiCard title="Bu Ay Giderler" value={`₺${(stats.thisMonthExpenses || 0).toLocaleString("tr-TR")}`} icon={CreditCard} accent="red" />
            </WidgetWrapper>
          )}
        </div>
      )}

      {/* Madde 5: Beklenen gelir + progress */}
      <RevenueProgressCard
        expectedTRY={stats.expectedTRY}
        expectedEUR={stats.expectedEUR}
        collectedTRY={stats.collectedTRY}
        collectedEUR={stats.collectedEUR}
        exchangeRate={exchangeRate}
      />

      {/* Madde 2: Hiç içerik üretilmemiş firmalar */}
      <NoContentCompanies />

      {/* Attention Widget */}
      {layout.includes("attention") && (
        <WidgetWrapper id="attention" editMode={editMode} onRemove={removeWidget}>
          <AttentionWidget />
        </WidgetWrapper>
      )}

      {/* Web Projects Widget */}
      {layout.includes("web_projects") && (
        <WidgetWrapper id="web_projects" editMode={editMode} onRemove={removeWidget}>
          <WebProjectsWidget />
        </WidgetWrapper>
      )}

      {/* This week recurring */}
      {layout.includes("recurring_week") && (
        <WidgetWrapper id="recurring_week" editMode={editMode} onRemove={removeWidget}>
          <RecurringWeekPanel />
        </WidgetWrapper>
      )}

      {/* Faturalar */}
      {(layout.includes("upcoming_invoices") || layout.includes("overdue_invoices")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {layout.includes("upcoming_invoices") && (
            <WidgetWrapper id="upcoming_invoices" editMode={editMode} onRemove={removeWidget}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gold" /> Bu Hafta Kesilecek Faturalar
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/faturalar">Tümü <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {upcomingInvoices.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">Bu hafta kesilecek fatura yok.</div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingInvoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div>
                            <div className="font-medium text-sm">{inv.company_name}</div>
                            <div className="text-xs text-muted-foreground">Vade: {formatDate(inv.due_date)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(inv.amount, inv.currency)}</div>
                            <Badge variant="outline" className={getStatusColor(inv.status)}>{getStatusLabel(inv.status)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </WidgetWrapper>
          )}
          {layout.includes("overdue_invoices") && (
            <WidgetWrapper id="overdue_invoices" editMode={editMode} onRemove={removeWidget}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" /> Geciken Ödemeler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {overdueInvoices.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">🎉 Geciken ödeme yok!</div>
                  ) : (
                    <div className="space-y-2">
                      {overdueInvoices.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                          <div>
                            <div className="font-medium text-sm">{inv.company_name}</div>
                            <div className="text-xs text-destructive font-medium">{Math.abs(diffDays(inv.due_date))} gün gecikti</div>
                          </div>
                          <div className="text-right font-semibold text-destructive">
                            {formatCurrency(inv.amount - (inv.paid_amount || 0), inv.currency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </WidgetWrapper>
          )}
        </div>
      )}

      {/* Onaylar */}
      {layout.includes("pending_approvals") && (pendingIdeas.length > 0 || clientPending.length > 0) && (
        <WidgetWrapper id="pending_approvals" editMode={editMode} onRemove={removeWidget}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {pendingIdeas.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> İç Onay Bekleyen ({pendingIdeas.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/onaylar">Tümü <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingIdeas.map(i => (
                    <div key={i.id} className="flex items-center p-2 rounded-lg border text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{i.title}</div>
                        <div className="text-xs text-muted-foreground">{i.company_name}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {clientPending.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-500" /> Müşteri Onayı Bekleyen ({clientPending.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/onaylar">Tümü <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {clientPending.map(a => (
                    <div key={a.id} className="flex items-center p-2 rounded-lg border text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{a.company_name}</div>
                        <div className="text-xs text-muted-foreground">{a.viewed_at ? "👁️ Görüldü" : "Henüz görmedi"}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </WidgetWrapper>
      )}

      {/* Hedef geride kalanlar */}
      {layout.includes("targets_behind") && targetsBehind.length > 0 && (
        <WidgetWrapper id="targets_behind" editMode={editMode} onRemove={removeWidget}>
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Target className="w-4 h-4" /> Hedefi Geride Kalan Firmalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {targetsBehind.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-destructive/5">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{t.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Tamamlanan: %{t.completion_percentage} • Periyot: {formatDate(t.period_start)} – {formatDate(t.period_end)}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/musteriler/${t.company_id}`}>Detay</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </WidgetWrapper>
      )}

      {/* Inbox widget */}
      {layout.includes("inbox_summary") && (
        <WidgetWrapper id="inbox_summary" editMode={editMode} onRemove={removeWidget}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" /> AI Inbox Özeti
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inbox">Inbox'a git <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <InboxSummaryWidget />
            </CardContent>
          </Card>
        </WidgetWrapper>
      )}

      {/* Quick actions */}
      <Card className="navy-gradient text-white border-0">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="text-xs uppercase tracking-widest text-gold font-semibold">Hızlı Erişim</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold">Hızlı bir aksiyon al</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              <Button asChild className="bg-gold text-slate-900 hover:bg-gold/90 shrink-0 h-8 text-xs md:h-9 md:text-sm">
                <Link to="/musteriler/yeni"><Plus className="w-3.5 h-3.5 mr-1" /> Yeni Müşteri</Link>
              </Button>
              <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 shrink-0 h-8 text-xs md:h-9 md:text-sm">
                <Link to="/anlik-planlama"><Zap className="w-3.5 h-3.5 mr-1" /> Anlık Plan</Link>
              </Button>
              <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 shrink-0 h-8 text-xs md:h-9 md:text-sm">
                <Link to="/ai-studio"><Sparkles className="w-3.5 h-3.5 mr-1" /> AI Stüdyo</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}