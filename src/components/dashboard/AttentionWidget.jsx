import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AlertTriangle, FileX, FileWarning, RefreshCw, Receipt } from "lucide-react";
import { diffDays, formatDate } from "@/lib/format";

export default function AttentionWidget() {
  const { data: companies = [] } = useQuery({
    queryKey: ["attention-companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false, status: "active" }, "name", 300),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: ideas = [] } = useQuery({
    queryKey: ["attention-ideas"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 500),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["attention-invoices"],
    queryFn: () => base44.entities.Invoice.filter({ deleted: false }, "-issue_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const items = useMemo(() => {
    const out = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1) Sözleşmesi 30 gün içinde bitecekler
    companies.forEach(c => {
      if (!c.contract_end_date) return;
      const d = diffDays(c.contract_end_date);
      if (d >= 0 && d <= 30) {
        out.push({
          type: "contract",
          icon: FileWarning,
          color: "text-rose-600 bg-rose-50",
          title: `${c.name} sözleşmesi ${d} gün içinde bitiyor`,
          link: `/musteriler/${c.id}`,
        });
      }
    });

    // 2) 30 gün içerik üretilmemiş firmalar
    const recentIdeaCompanies = new Set(
      ideas
        .filter(i => new Date(i.created_date) > thirtyDaysAgo)
        .map(i => i.company_id)
    );
    companies.forEach(c => {
      if (!recentIdeaCompanies.has(c.id)) {
        out.push({
          type: "no-content",
          icon: FileX,
          color: "text-amber-600 bg-amber-50",
          title: `${c.name} için 30 gündür içerik yok`,
          link: `/musteriler/${c.id}`,
        });
      }
    });

    // 3) Vadesi geçmiş faturalar
    invoices
      .filter(i => i.status === "overdue" || (i.status === "pending" && diffDays(i.due_date) < 0))
      .slice(0, 5)
      .forEach(inv => {
        out.push({
          type: "overdue",
          icon: Receipt,
          color: "text-red-600 bg-red-50",
          title: `${inv.company_name}: vadesi ${Math.abs(diffDays(inv.due_date))} gün geçmiş fatura`,
          link: `/faturalar`,
        });
      });

    // 4) Revizyon istenenler
    ideas
      .filter(i => i.approval_status === "revision_requested")
      .slice(0, 5)
      .forEach(i => {
        out.push({
          type: "revision",
          icon: RefreshCw,
          color: "text-orange-600 bg-orange-50",
          title: `${i.company_name}: "${i.title}" için revizyon istendi`,
          link: `/onaylar`,
        });
      });

    return out.slice(0, 8);
  }, [companies, ideas, invoices]);

  if (items.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" /> ⚠️ Dikkat Gerektiren
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              to={item.link}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors text-sm"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 truncate">{item.title}</span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}