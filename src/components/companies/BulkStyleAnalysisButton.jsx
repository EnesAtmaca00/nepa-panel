// Madde 6: Toplu stylememory analizi
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useJobs } from "@/lib/JobsContext";

export default function BulkStyleAnalysisButton({ companies = [] }) {
  const { runJob, getJobByKey } = useJobs();
  const jobKey = "bulk_style_analysis";
  const [running, setRunning] = useState(() => getJobByKey(jobKey)?.status === "running");

  const { data: allMems = [] } = useQuery({
    queryKey: ["all-style-memories"],
    queryFn: () => base44.entities.StyleMemory.list("-updated_date", 500),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const targets = useMemo(() => {
    const have = new Set(allMems.map(m => m.company_id));
    return companies.filter(c => c.status === "active" && !have.has(c.id));
  }, [companies, allMems]);

  if (targets.length === 0 && !running) return null;

  const run = () => {
    setRunning(true);
    const list = [...targets];
    runJob(
      async () => {
        let success = 0, failed = 0;
        for (const c of list) {
          try {
            const res = await base44.functions.invoke("analyzeStyleMemory", { company_id: c.id });
            if (res?.data?.success) success++; else failed++;
          } catch { failed++; }
        }
        return { success, failed };
      },
      { key: jobKey, title: `Görsel analizi (${list.length} firma)`, page: "Toplu stil analizi", href: "/musteriler" },
      (err, result) => {
        setRunning(false);
        if (err) { toast.error("Analiz hatası: " + err.message); return; }
        toast.success(`Tamamlandı: ${result.success} başarılı, ${result.failed} hatalı`);
      }
    );
  };

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={running}
      className="gap-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
    >
      {running ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Analiz ediliyor...</>
      ) : (
        <><Palette className="w-4 h-4" /> 🎨 Görsel Analizi ({targets.length})</>
      )}
    </Button>
  );
}