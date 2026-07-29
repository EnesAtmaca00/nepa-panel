// Madde 1: Pillar boş olan içerikler için hızlı atama butonu
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { toast } from "sonner";

const PILLARS = [
  { value: "egit", label: "📚 Eğit" },
  { value: "eglendir", label: "🎭 Eğlendir" },
  { value: "sat", label: "💰 Sat" },
  { value: "guven", label: "🤝 Güven" },
];

export default function PillarAssignButton({ ideaId, size = "xs", onAssigned }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const assign = async (pillar) => {
    try {
      await base44.entities.ContentIdea.update(ideaId, { content_pillar: pillar });
      toast.success("Kategori atandı");
      queryClient.invalidateQueries({ queryKey: ["all-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["company-ideas"] });
      setOpen(false);
      onAssigned?.(pillar);
    } catch (e) {
      toast.error("Hata: " + e.message);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          className={`inline-flex items-center gap-1 ${size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors`}
          title="İçerik kategorisi ata"
        >
          <Tag className="w-3 h-3" /> Ata
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" onClick={(e) => e.stopPropagation()}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">Kategori seç</div>
        {PILLARS.map(p => (
          <Button
            key={p.value}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-8"
            onClick={(e) => { e.stopPropagation(); assign(p.value); }}
          >
            {p.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}