import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

export default function StepServices({ data, update, services }) {
  const toggleService = (id) => {
    const current = data.agreed_services || [];
    update({
      agreed_services: current.includes(id)
        ? current.filter(s => s !== id)
        : [...current, id]
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Anlaşmalı Hizmetler</Label>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hizmet kataloğunda henüz hizmet yok. Önce Hizmet Kataloğu'na hizmet ekle.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {services.map(s => {
              const selected = (data.agreed_services || []).includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    selected ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"
                  }`}
                >
                  <Checkbox checked={selected} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.billing_type === "monthly" ? "Aylık abonelik" : "Tek seferlik"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5">Fiyatlandırma Tipi</Label>
          <Select value={data.pricing_type} onValueChange={(v) => update({ pricing_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Aylık Abonelik</SelectItem>
              <SelectItem value="one_time">Tek Seferlik</SelectItem>
              <SelectItem value="hybrid">Hibrit (Aylık + Tek seferlik)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Para Birimi</Label>
          <Select value={data.currency} onValueChange={(v) => update({ currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">₺ Türk Lirası</SelectItem>
              <SelectItem value="EUR">€ Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(data.pricing_type === "monthly" || data.pricing_type === "hybrid") && (
          <>
            <div>
              <Label className="mb-1.5">Aylık Ücret</Label>
              <Input
                type="number"
                value={data.monthly_fee || ""}
                onChange={(e) => update({ monthly_fee: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-1.5">Fatura Günü (1-31)</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={data.billing_day || 1}
                onChange={(e) => update({ billing_day: parseInt(e.target.value) || 1 })}
              />
            </div>
          </>
        )}

        {(data.pricing_type === "one_time" || data.pricing_type === "hybrid") && (
          <div className="md:col-span-2">
            <Label className="mb-1.5">Tek Seferlik Ücret</Label>
            <Input
              type="number"
              value={data.one_time_fee || ""}
              onChange={(e) => update({ one_time_fee: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        )}
      </div>
    </div>
  );
}