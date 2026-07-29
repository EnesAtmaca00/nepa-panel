import React from "react";
import { ShieldX, ShieldCheck, Send } from "lucide-react";

const OPTIONS = [
  {
    value: "none",
    icon: ShieldX,
    label: "Onay Yok",
    description: "İçerik direkt onaylı sayılır, hızlı akış.",
    color: "border-slate-300",
  },
  {
    value: "manual_internal",
    icon: ShieldCheck,
    label: "Manuel İç Onay",
    description: "Ben kendim onaylayacağım. Önerilen.",
    color: "border-emerald-400",
  },
  {
    value: "client_approval",
    icon: Send,
    label: "Müşteri Onayı",
    description: "Public link oluştur, müşteriye gönder.",
    color: "border-blue-400",
  },
];

export default function StepApproval({ data, update }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Bu, varsayılan onay modu olacak. Her içerik oluştururken yine değiştirebilirsin.
      </div>

      <div className="space-y-2">
        {OPTIONS.map(opt => {
          const Icon = opt.icon;
          const selected = data.default_approval_mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ default_approval_mode: opt.value })}
              className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                selected ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selected ? "bg-gold text-slate-900" : "bg-muted"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{opt.label}</div>
                <div className="text-sm text-muted-foreground">{opt.description}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${
                selected ? "border-gold bg-gold" : "border-muted-foreground/30"
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}