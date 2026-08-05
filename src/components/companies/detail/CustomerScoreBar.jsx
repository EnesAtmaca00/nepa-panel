import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, CheckSquare, TrendingUp } from "lucide-react";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/format";

export default function CustomerScoreBar({ company }) {
  const { data: contentIdeas = [] } = useQuery({
    queryKey: ["company-content-count", company.id],
    queryFn: () => base44.entities.ContentIdea.filter({ company_id: company.id, deleted: false }, "-created_date", 500),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["company-invoice-count", company.id],
    queryFn: () => base44.entities.Invoice.filter({ company_id: company.id, deleted: false }, "-issue_date", 500),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["company-task-count", company.id],
    queryFn: () => base44.entities.Task.filter({ company_id: company.id, deleted: false }, "-created_date", 500),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const clv = (company.monthly_fee || 0) * 12;
  const statusBadgeClass = getStatusColor(company.status);

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">İçerik</div>
              <div className="font-bold">{contentIdeas.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fatura</div>
              <div className="font-bold">{invoices.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Görev</div>
              <div className="font-bold">{tasks.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 col-span-2 md:col-span-1">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">CLV (1 yıl)</div>
              <div className="font-bold truncate">{formatCurrency(clv, company.currency)}</div>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 flex items-center md:justify-end">
            <Badge className={statusBadgeClass}>{getStatusLabel(company.status)}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}