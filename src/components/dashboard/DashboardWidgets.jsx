import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, GripVertical, X, Plus, Settings2,
  Users, Receipt, Target, Repeat, CalendarDays, CheckSquare,
  TrendingUp, AlertCircle, Mail, CreditCard, Globe, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const ALL_WIDGETS = [
  { id: "kpi_clients", label: "Aktif Müşteriler", icon: Users, description: "Toplam aktif müşteri sayısı" },
  { id: "kpi_revenue", label: "Beklenen Gelir", icon: TrendingUp, description: "Bu ay beklenen gelir" },
  { id: "kpi_debt", label: "Açık Borç", icon: AlertCircle, description: "Tahsil edilemeyen borç" },
  { id: "kpi_targets", label: "Hedef Tutturma", icon: Target, description: "Aylık hedef ortalaması" },
  { id: "upcoming_invoices", label: "Yaklaşan Faturalar", icon: Receipt, description: "Bu hafta vadeliler" },
  { id: "overdue_invoices", label: "Geciken Ödemeler", icon: AlertCircle, description: "Gecikmiş faturalar" },
  { id: "recurring_week", label: "Bu Haftaki Tekrarlayanlar", icon: Repeat, description: "Haftalık tekrarlayan görevler" },
  { id: "special_days", label: "Yaklaşan Özel Günler", icon: CalendarDays, description: "30 gün içindeki özel günler" },
  { id: "pending_approvals", label: "Bekleyen Onaylar", icon: CheckSquare, description: "İç ve müşteri onayları" },
  { id: "targets_behind", label: "Hedefi Geciken Firmalar", icon: Target, description: "Hedefi kaçıran müşteriler" },
  { id: "inbox_summary", label: "Inbox Özeti", icon: Mail, description: "Bugün gelen mailler ve önemli olanlar" },
  { id: "kpi_expenses", label: "Bu Ay Giderler", icon: CreditCard, description: "Bu aydaki toplam gider" },
  { id: "web_projects", label: "Web Projeleri", icon: Globe, description: "Aktif web projeleri durumu" },
  { id: "attention", label: "Dikkat Gerektiren", icon: AlertTriangle, description: "Sözleşme bitimi, içerik yokluğu, vade vb. uyarılar" },
];

const DEFAULT_LAYOUT = [
  "kpi_clients", "kpi_revenue", "kpi_debt", "kpi_targets",
  "attention",
  "upcoming_invoices", "overdue_invoices",
  "recurring_week",
  "web_projects",
  "pending_approvals", "targets_behind"
];

const STORAGE_KEY = "dashboard_widget_layout";

export function useDashboardLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  const [editMode, setEditMode] = useState(false);

  const saveLayout = (newLayout) => {
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
  };

  const removeWidget = (id) => {
    saveLayout(layout.filter(w => w !== id));
    toast.success("Widget kaldırıldı");
  };

  const addWidget = (id) => {
    if (!layout.includes(id)) {
      saveLayout([...layout, id]);
      toast.success("Widget eklendi");
    }
  };

  const resetLayout = () => {
    saveLayout(DEFAULT_LAYOUT);
    toast.success("Yerleşim sıfırlandı");
  };

  return { layout, editMode, setEditMode, removeWidget, addWidget, resetLayout, allWidgets: ALL_WIDGETS };
}

export function DashboardEditBar({ editMode, setEditMode, layout, removeWidget, addWidget, resetLayout, allWidgets }) {
  const hiddenWidgets = allWidgets.filter(w => !layout.includes(w.id));

  if (!editMode) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditMode(true)}>
          <Settings2 className="w-4 h-4" />
          Dashboard'ı Düzenle
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-gold/40 bg-gold/5">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-gold" />
            <span className="font-semibold text-sm">Dashboard Düzenleme Modu</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetLayout}>Varsayılana Sıfırla</Button>
            <Button size="sm" onClick={() => setEditMode(false)}>Bitti</Button>
          </div>
        </div>

        {hiddenWidgets.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Eklenebilir widgetlar:</p>
            <div className="flex flex-wrap gap-2">
              {hiddenWidgets.map(w => {
                const Icon = w.icon;
                return (
                  <Button
                    key={w.id}
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => addWidget(w.id)}
                  >
                    <Plus className="w-3 h-3" />
                    <Icon className="w-3 h-3" />
                    {w.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WidgetWrapper({ id, label, editMode, onRemove, children }) {
  return (
    <div className="relative group">
      {editMode && (
        <div className="absolute -top-2 -right-2 z-10 flex gap-1">
          <button
            onClick={() => onRemove(id)}
            className="w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow hover:bg-destructive/80 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {editMode && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-gold/50 pointer-events-none z-0" />
      )}
      {children}
    </div>
  );
}