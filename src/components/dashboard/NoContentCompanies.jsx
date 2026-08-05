// Madde 2: Hiç içerik üretilmemiş firmalar — Dikkat Merkezi
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function NoContentCompanies() {
  const navigate = useNavigate();

  const { data: companies = [] } = useQuery({
    queryKey: ["no-content-active-companies"],
    queryFn: () => base44.entities.Company.filter({ deleted: false, status: "active" }, "name", 300),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: ideas = [] } = useQuery({
    queryKey: ["no-content-ideas"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 1000),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const noContentCompanies = useMemo(() => {
    const withIdeas = new Set(ideas.map(i => i.company_id).filter(Boolean));
    return companies.filter(c => !withIdeas.has(c.id));
  }, [companies, ideas]);

  if (noContentCompanies.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          🚨 Hiç İçerik Üretilmemiş Firmalar ({noContentCompanies.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {noContentCompanies.map(c => (
          <div
            key={c.id}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-sm"
          >
            <span className="text-base shrink-0">🚨</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.name}</div>
              <div className="text-xs text-red-700">Hiç içerik üretilmemiş</div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/ai-studio?company=${c.id}`)}
              className="bg-red-600 hover:bg-red-700 text-white shrink-0 h-7 text-xs px-2"
            >
              Başla <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}