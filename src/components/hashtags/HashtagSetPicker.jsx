import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hash, ChevronDown, Plus, Check } from "lucide-react";

export default function HashtagSetPicker({ companyId, currentHashtags = [], onApply }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sets = [] } = useQuery({
    queryKey: ["hashtag-sets", companyId],
    queryFn: () => base44.entities.HashtagSet.filter(
      companyId ? { company_id: companyId } : {},
      "name", 50
    ),
    enabled: true,
    staleTime: 30_000,
  });

  const incrementUse = useMutation({
    mutationFn: (set) => base44.entities.HashtagSet.update(set.id, { use_count: (set.use_count || 0) + 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hashtag-sets"] }),
  });

  const applySet = (set) => {
    const existing = Array.isArray(currentHashtags) ? currentHashtags : [];
    const newTags = (set.hashtags || []).filter(t => !existing.includes(t));
    const merged = [...existing, ...newTags];
    onApply(merged);
    incrementUse.mutate(set);
    setOpen(false);
  };

  const companysets = sets.filter(s => s.company_id === companyId);
  const generalSets = sets.filter(s => !companyId || s.company_id !== companyId);

  if (sets.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1">
          <Hash className="w-3 h-3" />
          Set Seç
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-xs font-semibold text-muted-foreground px-1 mb-1.5">Hashtag Setleri</p>
        {companysets.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-1 mb-1">Bu Müşteriye Özel</p>
            {companysets.map(set => (
              <button
                key={set.id}
                className="w-full text-left p-2 rounded hover:bg-muted/60 flex items-start justify-between gap-2 group"
                onClick={() => applySet(set)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium">{set.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {(set.hashtags || []).slice(0, 4).join(" ")}
                    {(set.hashtags || []).length > 4 ? ` +${set.hashtags.length - 4}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {set.source === "competitor_analysis" && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">Rakip</Badge>
                  )}
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-accent" />
                </div>
              </button>
            ))}
          </div>
        )}
        {generalSets.length > 0 && companysets.length > 0 && <div className="border-t my-1" />}
        {generalSets.length > 0 && (
          <div>
            {companysets.length > 0 && <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-1 mb-1">Genel</p>}
            {generalSets.map(set => (
              <button
                key={set.id}
                className="w-full text-left p-2 rounded hover:bg-muted/60 flex items-start justify-between gap-2 group"
                onClick={() => applySet(set)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium">{set.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {(set.hashtags || []).slice(0, 4).join(" ")}
                    {(set.hashtags || []).length > 4 ? ` +${set.hashtags.length - 4}` : ""}
                  </p>
                </div>
                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-accent" />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}