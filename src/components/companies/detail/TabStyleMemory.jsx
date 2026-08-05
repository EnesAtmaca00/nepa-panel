import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, RefreshCw, Save, Edit, X } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export default function TabStyleMemory({ company }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: memList = [] } = useQuery({
    queryKey: ["style-memory", company.id],
    queryFn: () => base44.entities.StyleMemory.filter({ company_id: company.id }, "-updated_date", 1),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const memory = memList[0];

  useEffect(() => {
    if (memory && editMode) {
      setEditData({
        dominant_colors: (memory.dominant_colors || []).join(", "),
        secondary_colors: (memory.secondary_colors || []).join(", "),
        typography_style: memory.typography_style || "",
        composition_patterns: (memory.composition_patterns || []).join(", "),
        common_elements: (memory.common_elements || []).join(", "),
        mood_tags: (memory.mood_tags || []).join(", "),
        ai_summary: memory.ai_summary || "",
        prompt_injection: memory.prompt_injection || "",
      });
    }
  }, [memory, editMode]);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const res = await base44.functions.invoke("analyzeStyleMemory", { company_id: company.id });
      if (res.data?.success) {
        toast.success(res.data.text_based
          ? "Firma bilgileriyle tarz hafızası oluşturuldu"
          : `${res.data.analyzed_count} dosya analiz edildi`);
        queryClient.invalidateQueries({ queryKey: ["style-memory", company.id] });
      } else {
        toast.error(res.data?.error || "Analiz başarısız");
      }
    } catch (e) {
      toast.error("Hata: " + (e.message || ""));
    } finally {
      setAnalyzing(false);
    }
  };

  const saveEdit = async () => {
    if (!memory || !editData) return;
    const splitComma = (s) => s.split(",").map(x => x.trim()).filter(Boolean);
    try {
      await base44.entities.StyleMemory.update(memory.id, {
        dominant_colors: splitComma(editData.dominant_colors),
        secondary_colors: splitComma(editData.secondary_colors),
        typography_style: editData.typography_style,
        composition_patterns: splitComma(editData.composition_patterns),
        common_elements: splitComma(editData.common_elements),
        mood_tags: splitComma(editData.mood_tags),
        ai_summary: editData.ai_summary,
        prompt_injection: editData.prompt_injection,
      });
      queryClient.invalidateQueries({ queryKey: ["style-memory", company.id] });
      setEditMode(false);
      toast.success("Tarz hafızası güncellendi");
    } catch (e) {
      toast.error("Kaydetme hatası: " + e.message);
    }
  };

  const set = (k, v) => setEditData(d => ({ ...d, [k]: v }));

  return (
    <div className="space-y-6">
      <Card className="navy-gradient text-white border-0">
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold mb-1">Tarz Hafızası</div>
            <div className="text-lg font-bold">
              {memory ? `${memory.analyzed_files_count} dosya analiz edildi` : "Henüz analiz yapılmadı"}
            </div>
            {memory?.last_analysis_date && (
              <p className="text-sm text-white/70 mt-1">Son güncelleme: {formatDateTime(memory.last_analysis_date)}</p>
            )}
          </div>
          <div className="flex gap-2">
            {memory && (
              <Button
                variant="outline"
                onClick={() => setEditMode(!editMode)}
                className="text-white border-white/30 hover:bg-white/10"
              >
                {editMode ? <><X className="w-4 h-4 mr-1" /> İptal</> : <><Edit className="w-4 h-4 mr-1" /> Düzenle</>}
              </Button>
            )}
            <Button onClick={analyze} disabled={analyzing} className="bg-gold text-slate-900 hover:bg-gold/90">
              {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analiz ediliyor...</> : <><RefreshCw className="w-4 h-4 mr-2" /> {memory ? "Yenile" : "Analizi Başlat"}</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!memory ? (
        <Card><CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-2">Tarz hafızası henüz oluşturulmadı.</p>
          <p className="text-xs text-muted-foreground">"Analizi Başlat" butonuna basarak firma bilgileriyle veya yüklü görsellerle tarz hafızası oluşturabilirsiniz.</p>
        </CardContent></Card>
      ) : editMode && editData ? (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Edit className="w-4 h-4" /> Tarz Hafızasını Düzenle</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 text-xs">Dominant Renkler (virgülle)</Label>
                <Input value={editData.dominant_colors} onChange={e => set("dominant_colors", e.target.value)} placeholder="#hex1, #hex2, #hex3" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs">İkincil Renkler (virgülle)</Label>
                <Input value={editData.secondary_colors} onChange={e => set("secondary_colors", e.target.value)} placeholder="#hex1, #hex2" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs">Tipografi Stili</Label>
                <Input value={editData.typography_style} onChange={e => set("typography_style", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 text-xs">Mood Etiketleri (virgülle)</Label>
                <Input value={editData.mood_tags} onChange={e => set("mood_tags", e.target.value)} placeholder="minimal, lüks, sıcak" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs">Kompozisyon Kalıpları (virgülle)</Label>
                <Input value={editData.composition_patterns} onChange={e => set("composition_patterns", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 text-xs">Ortak Elementler (virgülle)</Label>
                <Input value={editData.common_elements} onChange={e => set("common_elements", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 text-xs">AI Tarif</Label>
              <Textarea value={editData.ai_summary} onChange={e => set("ai_summary", e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="mb-1.5 text-xs">Prompt Injection (AI'a verilecek stil bilgisi)</Label>
              <Textarea value={editData.prompt_injection} onChange={e => set("prompt_injection", e.target.value)} rows={3} />
            </div>
            <Button onClick={saveEdit} className="gap-2">
              <Save className="w-4 h-4" /> Değişiklikleri Kaydet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Dominant Renkler</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {memory.dominant_colors?.map((c, idx) => (
                    <div key={idx} className="space-y-1 text-center">
                      <div className="w-16 h-16 rounded-lg border-2 shadow-sm" style={{ backgroundColor: c }} />
                      <div className="text-[10px] font-mono">{c}</div>
                    </div>
                  ))}
                </div>
                {memory.secondary_colors?.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground mt-4 mb-2 uppercase tracking-wide">İkincil</div>
                    <div className="flex gap-1.5">
                      {memory.secondary_colors.map((c, idx) => (
                        <div key={idx} className="w-8 h-8 rounded border" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Tarz Etiketleri</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {memory.typography_style && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Tipografi</div>
                    <p className="text-sm">{memory.typography_style}</p>
                  </div>
                )}
                {memory.composition_patterns?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Kompozisyon</div>
                    <div className="flex flex-wrap gap-1">
                      {memory.composition_patterns.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
                    </div>
                  </div>
                )}
                {memory.common_elements?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Ortak Elementler</div>
                    <div className="flex flex-wrap gap-1">
                      {memory.common_elements.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>)}
                    </div>
                  </div>
                )}
                {memory.mood_tags?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Mood</div>
                    <div className="flex flex-wrap gap-1">
                      {memory.mood_tags.map((c, i) => <Badge key={i} className="bg-gold/10 text-gold">{c}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {memory.ai_summary && (
            <Card>
              <CardHeader><CardTitle className="text-base">AI Tarif</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line">{memory.ai_summary}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}