import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Mic, Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useJobs } from "@/lib/JobsContext";

export default function BrandVoiceGuide({ company }) {
  const queryClient = useQueryClient();
  const { runJob, getJobByKey } = useJobs();
  const jobKey = company ? `brand_voice_${company.id}` : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(company?.brand_voice_guide || "");
  const [generating, setGenerating] = useState(() => getJobByKey(jobKey)?.status === "running");

  const runGenerate = () => {
    setGenerating(true);
    runJob(
      async () => {
        const res = await base44.functions.invoke("generateBrandVoiceGuide", { company_id: company.id });
        if (res?.data?.error) throw new Error(res.data.error);
        return res.data?.brand_voice_guide;
      },
      { key: jobKey, title: "Marka sesi rehberi üretiliyor", page: company?.name || "", href: `/musteriler/${company?.id}` },
      (err, text) => {
        setGenerating(false);
        if (err) { toast.error("Hata: " + err.message); return; }
        setDraft(text || "");
        queryClient.invalidateQueries({ queryKey: ["company", company.id] });
        queryClient.invalidateQueries({ queryKey: ["companies"] });
        toast.success("Marka sesi rehberi üretildi!");
      }
    );
  };

  const save = useMutation({
    mutationFn: () => base44.entities.Company.update(company.id, { brand_voice_guide: draft }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setEditing(false);
      toast.success("Kaydedildi");
    },
  });

  const guide = company?.brand_voice_guide;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="w-4 h-4 text-orange-500" /> Marka Sesi Rehberi
        </CardTitle>
        <div className="flex gap-2">
          {guide && !editing && (
            <Button variant="outline" size="sm" onClick={() => { setDraft(guide); setEditing(true); }} className="gap-1.5">
              <Pencil className="w-3 h-3" /> Düzenle
            </Button>
          )}
          <Button
            size="sm"
            onClick={runGenerate}
            disabled={generating}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {guide ? "Yeniden Üret" : "AI ile Oluştur"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={16}
              className="font-mono text-xs"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setDraft(guide); setEditing(false); }}>
                <X className="w-3 h-3 mr-1" /> İptal
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="w-3 h-3 mr-1" /> Kaydet
              </Button>
            </div>
          </div>
        ) : guide ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{guide}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Mic className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Henüz marka sesi rehberi yok.</p>
            <p className="text-xs mt-1">"AI ile Oluştur" butonuna tıklayarak otomatik üretebilirsin.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}