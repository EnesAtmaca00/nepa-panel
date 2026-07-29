// SORUN 1C: Web mimarisi üretimi sırasında ilerleme göstergesi
import React, { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";

const STEPS = [
  { mesaj: "Firma bilgileri analiz ediliyor...", sure: 2000 },
  { mesaj: "Sayfa mimarisi kurgulanıyor...", sure: 4000 },
  { mesaj: "İçerik önerileri hazırlanıyor...", sure: 4000 },
  { mesaj: "AI prompt oluşturuluyor...", sure: 3000 },
];

export default function GenerationProgress() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const advance = () => {
      i++;
      if (i < STEPS.length) {
        setCurrentIndex(i);
        setTimeout(advance, STEPS[i].sure);
      }
    };
    const t = setTimeout(advance, STEPS[0].sure);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="py-8 px-4 space-y-4">
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        <p className="text-base font-medium">AI mimari oluşturuyor...</p>
      </div>
      <div className="max-w-md mx-auto space-y-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {i < currentIndex ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : i === currentIndex ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-500 flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted flex-shrink-0" />
            )}
            <span className={
              i < currentIndex ? "text-muted-foreground line-through" :
              i === currentIndex ? "font-semibold" :
              "text-muted-foreground"
            }>
              {s.mesaj}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">
        ⏱ Bu işlem yaklaşık 15-30 saniye sürer
      </p>
    </div>
  );
}