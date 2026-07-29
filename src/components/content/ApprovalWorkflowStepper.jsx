import React from "react";
import { Check, ChevronRight } from "lucide-react";

const STEPS = [
  { key: "pending_internal", label: "İç Onay", short: "1" },
  { key: "approved", label: "Onaylandı", short: "2" },
  { key: "sent_to_client", label: "Müşteriye Gitti", short: "3" },
  { key: "client_approved", label: "Müşteri Onayladı", short: "4" },
];

export default function ApprovalWorkflowStepper({ status, size = "sm" }) {
  const currentIdx = STEPS.findIndex(s => s.key === status);
  const isRevisionOrRejected = status === "revision_requested" || status === "rejected";

  if (isRevisionOrRejected) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
        status === "rejected"
          ? "bg-red-100 text-red-700 border border-red-200"
          : "bg-amber-100 text-amber-700 border border-amber-200"
      }`}>
        {status === "rejected" ? "❌ Reddedildi" : "🔁 Revizyon İstendi"}
      </div>
    );
  }

  const dotClass = size === "sm" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs";

  return (
    <div className="inline-flex items-center gap-1">
      {STEPS.map((s, idx) => {
        const isDone = currentIdx > idx;
        const isCurrent = currentIdx === idx;
        return (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-1">
              <div className={`${dotClass} rounded-full flex items-center justify-center font-bold transition-colors ${
                isDone ? "bg-emerald-500 text-white" :
                isCurrent ? "bg-orange-500 text-white ring-2 ring-orange-200" :
                "bg-slate-200 text-slate-500"
              }`}>
                {isDone ? <Check className="w-3 h-3" /> : s.short}
              </div>
              <span className={`text-[10px] hidden sm:inline ${
                isCurrent ? "font-semibold text-orange-700" :
                isDone ? "text-emerald-700" :
                "text-muted-foreground"
              }`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}