import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Repeat } from "lucide-react";

const FREQ_LABEL = {
  weekly: "Haftalık",
  monthly: "Aylık",
  custom: "Özel",
};

const DAY_LABEL = {
  1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 7: "Pzr",
};

export default function StepRecurring({ data, update, templates }) {
  const subscribed = data.recurring_content_subscriptions || [];

  const toggle = (id) => {
    update({
      recurring_content_subscriptions: subscribed.includes(id)
        ? subscribed.filter(s => s !== id)
        : [...subscribed, id]
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 flex items-start gap-3">
        <Repeat className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Tekrarlayan İçerikler</p>
          <p className="text-muted-foreground">Bu firmaya hangi otomatik şablonların düzenli üretileceğini seç.</p>
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Henüz şablon yok. Tekrarlayanlar sayfasından şablon ekleyebilirsin.
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => {
            const selected = subscribed.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                  selected ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"
                }`}
              >
                <Checkbox checked={selected} />
                <span className="text-2xl">{t.emoji || "🔁"}</span>
                <div className="flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {FREQ_LABEL[t.frequency]}
                    {t.day_of_week && ` • Her ${DAY_LABEL[t.day_of_week]}`}
                    {t.day_of_month && ` • Ayın ${t.day_of_month}'i`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}