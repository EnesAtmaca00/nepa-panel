import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { key: "pending_internal", label: "İç Onay" },
  { key: "approved", label: "Onaylandı" },
  { key: "sent_to_client", label: "Müşteriye Gönderildi" },
  { key: "client_approved", label: "Müşteri Onayı" },
];

const ORDER = ["pending_internal", "approved", "sent_to_client", "client_approved"];

export default function ApprovalProgressBar({ status, approvalMode }) {
  // approval_mode = "none" ise kontrol yok
  if (approvalMode === "none") return null;
  // approval_mode = "manual_internal" ise sadece ilk 2 adım
  const steps = approvalMode === "manual_internal" ? STEPS.slice(0, 2) : STEPS;

  const currentIdx = ORDER.indexOf(status);
  // revision_requested veya rejected: özel
  if (status === "revision_requested") {
    return (
      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm">
        <span className="font-semibold text-rose-700">🔄 Revizyon İstendi</span>
        <p className="text-xs text-rose-600 mt-1">Müşteri tarafından revizyon talep edildi.</p>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm">
        <span className="font-semibold text-rose-700">❌ Reddedildi</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full">
      {steps.map((step, idx) => {
        const isDone = currentIdx > idx;
        const isActive = currentIdx === idx;
        const isPending = currentIdx < idx;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isDone ? "bg-emerald-500 text-white" :
                isActive ? "bg-orange-500 text-white ring-4 ring-orange-100 animate-pulse" :
                "bg-slate-200 text-slate-400"
              }`}>
                {isDone ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={`text-[10px] text-center whitespace-nowrap ${
                isActive ? "font-bold text-orange-600" :
                isDone ? "text-emerald-600" :
                "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 -mt-4 ${
                isDone ? "bg-emerald-500" : "bg-slate-200"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}