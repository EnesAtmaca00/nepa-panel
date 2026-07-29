import React from "react";
import { Search, PenLine, ShieldCheck, Loader2, Check, AlertTriangle } from "lucide-react";

const STEPS = [
  { key: "researcher", label: "Araştırmacı", icon: Search, desc: "Firma bağlamı toplanıyor" },
  { key: "drafter", label: "Üretici", icon: PenLine, desc: "İçerik üretiliyor" },
  { key: "auditor", label: "Denetçi", icon: ShieldCheck, desc: "Kalite kontrolü yapılıyor" },
];

export default function AgentPipelineStatus({ steps = {}, compact = false }) {
  if (!steps || Object.keys(steps).length === 0) return null;

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "p-2 rounded-lg bg-muted/40 border"}`}>
      {STEPS.map((s, idx) => {
        const status = steps[s.key]; // "running" | "completed" | "failed" | undefined
        if (!status) return null;

        const Icon = s.icon;
        const isRunning = status === "running";
        const isCompleted = status === "completed";
        const isFailed = status === "failed";

        return (
          <React.Fragment key={s.key}>
            {idx > 0 && steps[STEPS[idx - 1]?.key] && (
              <div className={`w-4 h-px ${isCompleted || isRunning ? "bg-gold" : "bg-border"}`} />
            )}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                isRunning ? "bg-gold/15 text-gold animate-pulse" :
                isCompleted ? "bg-emerald-50 text-emerald-700" :
                isFailed ? "bg-rose-50 text-rose-600" :
                "bg-muted text-muted-foreground"
              }`}
              title={s.desc}
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> :
               isCompleted ? <Check className="w-3 h-3" /> :
               isFailed ? <AlertTriangle className="w-3 h-3" /> :
               <Icon className="w-3 h-3" />}
              <span>{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}