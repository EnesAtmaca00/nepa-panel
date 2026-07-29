import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, FileText } from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel, PLATFORM_LABELS } from "@/lib/format";
import ContentIdeaDialog from "@/components/content/ContentIdeaDialog";
import PillarBadge from "@/components/content/PillarBadge";
import PillarAssignButton from "@/components/content/PillarAssignButton";

export default function TabContent({ company }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: ideas = [] } = useQuery({
    queryKey: ["company-ideas", company.id],
    queryFn: () => base44.entities.ContentIdea.filter({ company_id: company.id, deleted: false }, "-scheduled_date", 200),
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-mini"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 200),
    initialData: [],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">İçerikler ({ideas.length})</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> İçerik Ekle
        </Button>
      </div>

      {ideas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Henüz içerik yok. AI Stüdyosu'ndan üretebilirsin.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {ideas.map(idea => (
            <Card key={idea.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditing(idea); setOpen(true); }}>
              <CardContent className="p-3 flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm">{idea.title}</h3>
                    <Badge variant="outline" className="text-[10px]">{PLATFORM_LABELS[idea.platform] || idea.platform}</Badge>
                    {idea.content_pillar ? (
                      <PillarBadge pillar={idea.content_pillar} size="sm" />
                    ) : (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500 border-slate-200">
                          — Kategori Yok
                        </Badge>
                        <PillarAssignButton ideaId={idea.id} />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> {formatDate(idea.scheduled_date)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getStatusColor(idea.work_status === "published" ? "achieved" : idea.work_status === "in_progress" ? "in_progress" : "pending")}>
                    {getStatusLabel(idea.work_status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContentIdeaDialog
        open={open}
        onOpenChange={setOpen}
        idea={editing}
        defaultDate={null}
        companies={companies}
      />
    </div>
  );
}