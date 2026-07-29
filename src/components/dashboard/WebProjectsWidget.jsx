import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "@/lib/format";

export default function WebProjectsWidget() {
  const { data: projects = [] } = useQuery({
    queryKey: ["web-projects-widget"],
    queryFn: () => base44.entities.WebsiteProject.list("-created_date", 100),
    initialData: [],
  });

  const stats = useMemo(() => {
    const planning = projects.filter(p => p.delivery_status === "Planlanıyor" || !p.delivery_status).length;
    const building = projects.filter(p => p.delivery_status === "Yapım Aşamasında").length;
    const delivered = projects.filter(p => p.delivery_status === "Teslim Edildi").length;
    const lastDelivered = projects
      .filter(p => p.delivery_status === "Teslim Edildi")
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];
    return { planning, building, delivered, lastDelivered };
  }, [projects]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-orange-500" /> 🌐 Web Projeleri
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/web-projeleri">Tümü <ArrowRight className="w-3 h-3 ml-1" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-slate-50">
            <div className="text-2xl font-bold text-slate-700">{stats.planning}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Planlanıyor</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-50">
            <div className="text-2xl font-bold text-orange-600">{stats.building}</div>
            <div className="text-[10px] text-orange-700 uppercase">Yapımda</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50">
            <div className="text-2xl font-bold text-emerald-600">{stats.delivered}</div>
            <div className="text-[10px] text-emerald-700 uppercase">Teslim</div>
          </div>
        </div>
        {stats.lastDelivered && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <span className="font-medium">Son teslim:</span> {stats.lastDelivered.company_name} • {formatDate(stats.lastDelivered.updated_date)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}