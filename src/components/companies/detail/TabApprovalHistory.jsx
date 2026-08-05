import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const STATUS_LABEL = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  revision: "Revizyon İstendi",
  rejected: "Reddedildi",
};

const STATUS_COLOR = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  revision: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};

export default function TabApprovalHistory({ company }) {
  const { data: approvals = [] } = useQuery({
    queryKey: ["company-approvals", company.id],
    queryFn: () => base44.entities.ClientApproval.filter({ company_id: company.id }, "-sent_at", 100),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  if (approvals.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
        Henüz müşteri onayı geçmişi yok.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {approvals.map(a => (
        <Card key={a.id}>
          <CardContent className="p-4 flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Gönderildi: {formatDateTime(a.sent_at)}</div>
              {a.viewed_at && <div className="text-xs text-muted-foreground">Görüldü: {formatDateTime(a.viewed_at)}</div>}
              {a.approved_at && <div className="text-xs text-muted-foreground">Yanıtlandı: {formatDateTime(a.approved_at)}</div>}
              {a.approved_by_name && <div className="text-sm font-medium mt-1">{a.approved_by_name}</div>}
              {a.client_comments && <p className="text-sm mt-2 p-2 bg-muted rounded">{a.client_comments}</p>}
            </div>
            <Badge className={STATUS_COLOR[a.status]}>{STATUS_LABEL[a.status]}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}