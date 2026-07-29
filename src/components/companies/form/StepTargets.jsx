import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Target } from "lucide-react";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/format";

export default function StepTargets({ data, update }) {
  const [newPlatform, setNewPlatform] = useState("");

  const monthly = data.monthly_targets || {};
  const weekly = data.weekly_targets || {};

  const setMonthly = (key, val) => update({ monthly_targets: { ...monthly, [key]: parseInt(val) || 0 } });
  const setWeekly = (key, val) => update({ weekly_targets: { ...weekly, [key]: parseInt(val) || 0 } });

  const removeKey = (key) => {
    const m = { ...monthly }; delete m[key];
    const w = { ...weekly }; delete w[key];
    update({ monthly_targets: m, weekly_targets: w });
  };

  const addPlatform = () => {
    if (newPlatform && !monthly[newPlatform]) {
      setMonthly(newPlatform, 0);
      setNewPlatform("");
    }
  };

  const allKeys = [...new Set([...Object.keys(monthly), ...Object.keys(weekly)])];

  return (
    <div className="space-y-5">
      <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 flex items-start gap-3">
        <Target className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Hedef belirleme isteğe bağlıdır.</p>
          <p className="text-muted-foreground">Belirlersen, performans takibi ve hatırlatmalar otomatik çalışır.</p>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Platform / Format Hedefleri</Label>

        <div className="space-y-2">
          {allKeys.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Henüz hedef eklenmedi. Aşağıdan platform ekleyebilirsin.</p>
          )}
          {allKeys.map(key => (
            <div key={key} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border">
              <div className="col-span-12 sm:col-span-5 text-sm font-medium truncate">
                {PLATFORM_LABELS[key] || key}
              </div>
              <div className="col-span-5 sm:col-span-3">
                <Input
                  type="number"
                  placeholder="Aylık"
                  value={monthly[key] || ""}
                  onChange={(e) => setMonthly(key, e.target.value)}
                />
              </div>
              <div className="col-span-5 sm:col-span-3">
                <Input
                  type="number"
                  placeholder="Haftalık"
                  value={weekly[key] || ""}
                  onChange={(e) => setWeekly(key, e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeKey(key)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <select
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            className="flex-1 h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="">Platform seç...</option>
            {PLATFORMS.filter(p => !monthly[p] && !weekly[p]).map(p => (
              <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
            ))}
          </select>
          <Button type="button" onClick={addPlatform} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Ekle
          </Button>
        </div>
      </div>

      <div className="border-t pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="cursor-pointer">Tekrarlayan içerikler hedefe sayılsın</Label>
            <p className="text-xs text-muted-foreground">Hayırlı Cumalar gibi şablonlar hedefi doldursun mu?</p>
          </div>
          <Switch
            checked={data.recurring_counts_toward_target ?? true}
            onCheckedChange={(v) => update({ recurring_counts_toward_target: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="cursor-pointer">Hedef hatırlatmaları aktif</Label>
            <p className="text-xs text-muted-foreground">Geride kalınca uyarı al.</p>
          </div>
          <Switch
            checked={data.target_reminders_enabled ?? true}
            onCheckedChange={(v) => update({ target_reminders_enabled: v })}
          />
        </div>
      </div>
    </div>
  );
}