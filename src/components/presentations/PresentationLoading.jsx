// Sunum üretilirken aşama göstergesi
import React from "react";
import { Loader2, Check } from "lucide-react";

const STEPS = [
  { key: "research", label: "Müşteri analiz ediliyor..." },
  { key: "draft", label: "Sunum içeriği oluşturuluyor..." },
  { key: "deploy", label: "Dosyalar hazırlanıyor..." },
];

export default function PresentationLoading({ currentStep }) {
  return (
    <div className="max-w-md mx-auto py-12 text-center space-y-5">
      <div className="text-5xl">🎯</div>
      <h2 className="text-xl font-bold">Sunumun Hazırlanıyor</h2>
      <div className="space-y-3 text-left">
        {STEPS.map((s, i) => {
          const done = STEPS.findIndex((x) => x.key === currentStep) > i;
          const active = s.key === currentStep;
          return (
            <div key={s.key} className="flex items-center gap-2 text-sm">
              {done ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : active ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted" />
              )}
              <span className={done ? "text-muted-foreground line-through" : active ? "font-semibold" : "text-muted-foreground"}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}