import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Building2, Send, ShieldCheck, ShieldX, Pencil, FileX, FileWarning } from "lucide-react";
import { formatCurrency, getStatusColor, getStatusLabel, COUNTRY_FLAGS, diffDays } from "@/lib/format";
import CompanyLogo from "@/components/CompanyLogo";
import PortfolioSummary from "@/components/companies/PortfolioSummary";
import BulkStyleAnalysisButton from "@/components/companies/BulkStyleAnalysisButton";

const APPROVAL_BADGES = {
  none: { label: "Onay Yok", icon: ShieldX, className: "bg-slate-100 text-slate-600 border-slate-200" },
  manual_internal: { label: "İç Onay", icon: ShieldCheck, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  client_approval: { label: "Müşteri Onayı", icon: Send, className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export default function Companies() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "-created_date", 200),
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-issue_date", 500),
    initialData: [],
  });

  // Retention için son 30 günde içerik üretilen firmaları sayalım
  const { data: recentIdeas = [] } = useQuery({
    queryKey: ["companies-recent-ideas"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 500),
    initialData: [],
  });

  // Madde 3: StyleMemory yok badge için
  const { data: styleMems = [] } = useQuery({
    queryKey: ["companies-style-mems"],
    queryFn: () => base44.entities.StyleMemory.list("-updated_date", 500),
    initialData: [],
  });
  const styleMap = useMemo(() => {
    const s = new Set();
    styleMems.forEach(m => s.add(m.company_id));
    return s;
  }, [styleMems]);

  const retentionMap = useMemo(() => {
    const map = {};
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    recentIdeas.forEach(i => {
      if (new Date(i.created_date) > thirtyAgo) map[i.company_id] = true;
    });
    return map;
  }, [recentIdeas]);

  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (countryFilter !== "all" && c.country !== countryFilter) return false;
      return true;
    });
  }, [companies, search, statusFilter, countryFilter]);

  const debtMap = useMemo(() => {
    const map = {};
    invoices.forEach(i => {
      if (i.status === "pending" || i.status === "overdue" || i.status === "partial") {
        if (!map[i.company_id]) map[i.company_id] = { TRY: 0, EUR: 0 };
        map[i.company_id][i.currency || "TRY"] += (i.amount || 0) - (i.paid_amount || 0);
      }
    });
    return map;
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Müşteriler</h1>
          <p className="text-muted-foreground text-sm mt-1">{companies.length} kayıtlı müşteri</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BulkStyleAnalysisButton companies={companies} />
          <Button asChild className="gap-2">
            <Link to="/musteriler/yeni"><Plus className="w-4 h-4" /> Yeni Müşteri</Link>
          </Button>
        </div>
      </div>

      {/* Madde 7: Portföy özeti */}
      <PortfolioSummary companies={companies} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <label className="sr-only" htmlFor="musteri-ara">Müşteri adı ile ara</label>
          <Input
            id="musteri-ara"
            placeholder="Müşteri adı ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="paused">Duraklatıldı</SelectItem>
            <SelectItem value="ended">Sonlandı</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Ülke" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ülkeler</SelectItem>
            <SelectItem value="TR">🇹🇷 Türkiye</SelectItem>
            <SelectItem value="BE">🇧🇪 Belçika</SelectItem>
            <SelectItem value="OTHER">🌍 Diğer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              {companies.length === 0 ? "Henüz müşteri eklenmedi." : "Filtreyle eşleşen müşteri yok."}
            </p>
            {companies.length === 0 && (
              <Button asChild><Link to="/musteriler/yeni"><Plus className="w-4 h-4 mr-2" /> İlk Müşterini Ekle</Link></Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const approval = APPROVAL_BADGES[c.default_approval_mode] || APPROVAL_BADGES.manual_internal;
            const ApprovalIcon = approval.icon;
            const debt = debtMap[c.id];
            return (
              <div key={c.id} className="group relative">
                <Link to={`/musteriler/${c.id}`} className="block">
                  <Card className="h-full hover:shadow-lg hover:border-gold/50 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <CompanyLogo logoUrl={c.logo_url} name={c.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold truncate group-hover:text-gold transition-colors">{c.name}</h3>
                            <span className="text-base">{COUNTRY_FLAGS[c.country] || "🌍"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{c.sector || "—"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <Badge variant="outline" className={getStatusColor(c.status)}>{getStatusLabel(c.status)}</Badge>
                        <Badge variant="outline" className={approval.className}>
                          <ApprovalIcon className="w-3 h-3 mr-1" />
                          {approval.label}
                        </Badge>
                        {c.status === "active" && !retentionMap[c.id] && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            <FileX className="w-3 h-3 mr-1" /> İçerik Yok
                          </Badge>
                        )}
                        {c.status === "active" && !styleMap.has(c.id) && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                            🎨 Stil analizi yok
                          </Badge>
                        )}
                        {c.contract_end_date && diffDays(c.contract_end_date) >= 0 && diffDays(c.contract_end_date) <= 30 && (
                          <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">
                            <FileWarning className="w-3 h-3 mr-1" /> {diffDays(c.contract_end_date)} gün kaldı
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-xs">Aylık ücret</span>
                          <span className="font-medium">{formatCurrency(c.monthly_fee || 0, c.currency)}</span>
                        </div>
                        {(c.monthly_fee || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">CLV (12 ay)</span>
                            <span className="font-medium text-gold">{formatCurrency((c.monthly_fee || 0) * 12, c.currency)}</span>
                          </div>
                        )}
                        {debt && (debt.TRY > 0 || debt.EUR > 0) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Açık borç</span>
                            <span className="font-medium text-destructive">
                              {debt.TRY > 0 && formatCurrency(debt.TRY, "TRY")}
                              {debt.TRY > 0 && debt.EUR > 0 && " / "}
                              {debt.EUR > 0 && formatCurrency(debt.EUR, "EUR")}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link to={`/musteriler/${c.id}/duzenle`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}