import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, CalendarDays, Sparkles, Loader2, Trash2 } from "lucide-react";
import { formatDate, diffDays, todayISO } from "@/lib/format";
import { toast } from "sonner";

const TYPE_LABELS = {
  national_holiday: "Resmi Tatil",
  religious: "Dini",
  international: "Uluslararası",
  sectoral: "Sektörel",
  custom: "Özel",
};

function computeOccurrence(day, year) {
  const y = year || new Date().getFullYear();
  if (day.date_rule_type === "fixed" && day.fixed_date) {
    return `${y}-${day.fixed_date}`;
  }
  if (day.date_rule_type === "dynamic" && day.dynamic_rule) {
    // Basit hesaplama (frontend için)
    function nthDay(month, weekday, n) {
      const d = new Date(y, month - 1, 1);
      let count = 0;
      while (d.getMonth() === month - 1) {
        if (d.getDay() === weekday) {
          count++;
          if (count === n) return d.toISOString().split("T")[0];
        }
        d.setDate(d.getDate() + 1);
      }
      return null;
    }
    function lastDay(month, weekday) {
      const d = new Date(y, month, 0);
      while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    }
    switch (day.dynamic_rule) {
      case "anneler_gunu": return nthDay(5, 0, 2);
      case "babalar_gunu": return nthDay(6, 0, 3);
      case "black_friday": return lastDay(11, 5);
      case "cyber_monday": {
        const bf = lastDay(11, 5);
        if (!bf) return null;
        const d = new Date(bf);
        d.setDate(d.getDate() + 3);
        return d.toISOString().split("T")[0];
      }
      default: return null;
    }
  }
  return null;
}

const DEFAULT_FORM = { name: "", date_rule_type: "fixed", fixed_date: "", type: "custom", countries: ["TR"], emoji: "📅", description: "" };

export default function SpecialDays() {
  const queryClient = useQueryClient();
  const [country, setCountry] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data: days = [] } = useQuery({
    queryKey: ["special-days"],
    queryFn: () => base44.entities.SpecialDay.list("name", 500),
    initialData: [],
  });

  const enriched = useMemo(() => {
    const today = todayISO();
    const list = days.map(d => {
      const thisYear = computeOccurrence(d, new Date().getFullYear());
      const nextOccurrence = thisYear && thisYear >= today
        ? thisYear
        : computeOccurrence(d, new Date().getFullYear() + 1);
      return { ...d, next_date: nextOccurrence };
    });
    return list
      .filter(d => country === "all" || d.countries?.includes(country) || d.countries?.includes("GLOBAL"))
      .sort((a, b) => (a.next_date || "9999").localeCompare(b.next_date || "9999"));
  }, [days, country]);

  const seedAll = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke("seedAppData", {});
      queryClient.invalidateQueries({ queryKey: ["special-days"] });
      toast.success("Hazır özel günler yüklendi");
    } catch (e) {
      toast.error("Yüklenemedi");
    } finally {
      setSeeding(false);
    }
  };

  const save = useMutation({
    mutationFn: (payload) => base44.entities.SpecialDay.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-days"] });
      toast.success("Özel gün eklendi");
      setOpen(false);
      setForm(DEFAULT_FORM);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.SpecialDay.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-days"] });
      toast.success("Silindi");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Özel Günler Takvimi</h1>
          <p className="text-muted-foreground text-sm mt-1">{days.length} özel gün kayıtlı</p>
        </div>
        <div className="flex gap-2">
          {days.length === 0 && (
            <Button variant="outline" onClick={seedAll} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Hazır Setini Yükle
            </Button>
          )}
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Özel Gün Ekle
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Ülkeler</SelectItem>
            <SelectItem value="TR">🇹🇷 Türkiye</SelectItem>
            <SelectItem value="BE">🇧🇪 Belçika</SelectItem>
            <SelectItem value="GLOBAL">🌍 Global</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {enriched.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Özel gün yok.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {enriched.map(d => {
            const days_left = d.next_date ? diffDays(d.next_date) : null;
            return (
              <Card key={d.id} className={`relative ${days_left !== null && days_left >= 0 && days_left <= 7 ? "border-gold ring-1 ring-gold/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{d.emoji || "📅"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm leading-tight">{d.name}</h3>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {d.next_date ? formatDate(d.next_date) : "—"}
                        {days_left !== null && days_left >= 0 && (
                          <span className={`ml-2 font-semibold ${days_left <= 7 ? "text-gold" : ""}`}>
                            {days_left === 0 ? "Bugün!" : `${days_left} gün kaldı`}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(d.countries || []).map(c => (
                          <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                        ))}
                        <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[d.type]}</Badge>
                      </div>
                    </div>
                    {d.type === "custom" && (
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(d.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Özel Gün</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5">İsim</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn: Müşteri Şükran Günü" />
            </div>
            <div>
              <Label className="mb-1.5">Tarih (MM-DD)</Label>
              <Input value={form.fixed_date} onChange={(e) => setForm({ ...form, fixed_date: e.target.value })} placeholder="06-15" />
            </div>
            <div>
              <Label className="mb-1.5">Emoji</Label>
              <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🎉" maxLength={4} />
            </div>
            <div>
              <Label className="mb-1.5">Açıklama</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.name}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}