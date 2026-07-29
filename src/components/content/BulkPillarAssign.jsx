// Madde 1: Toplu pillar atama (pillar'sız tüm içerikler için)
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tag, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PILLARS = [
  { value: "egit", label: "📚 Eğit" },
  { value: "eglendir", label: "🎭 Eğlendir" },
  { value: "sat", label: "💰 Sat" },
  { value: "guven", label: "🤝 Güven" },
];

export default function BulkPillarAssign() {
  const queryClient = useQueryClient();
  const [pillar, setPillar] = useState("");
  const [working, setWorking] = useState(false);

  const { data: unassigned = [] } = useQuery({
    queryKey: ["unassigned-pillar-ideas"],
    queryFn: () => base44.entities.ContentIdea.filter({ deleted: false }, "-created_date", 500),
    initialData: [],
    select: (rows) => rows.filter(r => !r.content_pillar),
  });

  if (unassigned.length === 0) return null;

  const apply = async () => {
    if (!pillar) {
      toast.error("Önce kategori seç");
      return;
    }
    setWorking(true);
    try {
      // Sırayla güncelle (bulk update API yok)
      for (const idea of unassigned) {
        await base44.entities.ContentIdea.update(idea.id, { content_pillar: pillar });
      }
      toast.success(`${unassigned.length} içeriğe kategori atandı`);
      queryClient.invalidateQueries({ queryKey: ["all-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-pillar-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["company-ideas"] });
      setPillar("");
    } catch (e) {
      toast.error("Hata: " + e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex-wrap">
      <Tag className="w-4 h-4 text-amber-600" />
      <span className="text-sm font-medium">Kategorisiz içerikler:</span>
      <Badge variant="outline" className="bg-white">{unassigned.length} adet</Badge>
      <div className="flex-1" />
      <Select value={pillar} onValueChange={setPillar}>
        <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Toplu kategori seç..." /></SelectTrigger>
        <SelectContent>
          {PILLARS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={apply} disabled={!pillar || working}>
        {working ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Atanıyor...</> : "Hepsine Uygula"}
      </Button>
    </div>
  );
}