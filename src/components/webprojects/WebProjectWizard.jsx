import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Save } from "lucide-react";
import { toast } from "sonner";
import WizardStep1 from "./WizardStep1";
import WizardStep2 from "./WizardStep2";
import WizardStep3 from "./WizardStep3";
import GenerationProgress from "./GenerationProgress";
import { saveAppState, clearAppState } from "@/lib/appState";
import { useJobs } from "@/lib/JobsContext";
import { runWebsiteArchitectureJob } from "@/lib/jobRunners";

const STEPS = [
  { num: 1, title: "Firma & Temel Bilgiler" },
  { num: 2, title: "İhtiyaç Analizi" },
  { num: 3, title: "Üretim & Sonuçlar" },
];

const EMPTY = {
  company_id: "",
  company_name: "",
  project_name: "",
  sector: "",
  deadline: "",
  features: [],
  page_count: 5,
  wants_animation: false,
  animation_intensity: "balanced",
  color_palette: [],
  old_website_url: "",
  old_website_content: {},
  extra_specs: "",
  reference_links: [],
  ai_tool: "base44",
  ai_tool_other: "",
  delivery_status: "Planlanıyor",
  generation_status: "idle",
};

export default function WebProjectWizard({ open, onOpenChange, project, companies }) {
  const queryClient = useQueryClient();
  const { runJob } = useJobs();
  const [step, setStep] = useState(1);
  const [data, setData] = useState(EMPTY);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // SORUN 2: Debounce auto-save için ref
  const saveTimerRef = useRef(null);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  useEffect(() => {
    if (!open) {
      // Modal kapanınca pending save'leri çalıştır
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }
    if (project) {
      setData({ ...EMPTY, ...project });
      setStep(project.architecture ? 3 : 1);
      saveAppState("webProjectDraft", project.id);
    } else {
      setData(EMPTY);
      setStep(1);
      clearAppState("webProjectDraft");
    }
  }, [project, open]);

  // SORUN 2: Form değiştikçe DB'ye debounce kayıt (sadece kayıt varsa)
  const debouncedSave = useCallback((payload) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const current = latestDataRef.current;
      if (!current.id) return; // Henüz oluşturulmadıysa atla
      setIsSaving(true);
      try {
        const toSave = { ...current, ...payload };
        toSave.estimated_page_count = toSave.page_count;
        await base44.entities.WebsiteProject.update(current.id, toSave);
        queryClient.invalidateQueries({ queryKey: ["web-projects"] });
      } catch (e) {
        console.warn("Auto-save failed:", e);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  }, [queryClient]);

  // setData wrapper — her değişikliği auto-save tetikler
  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  // İlk create — kullanıcı 1. adımdan ilerlediğinde yapılır
  const ensureCreated = async () => {
    if (data.id) return data;
    const payload = { ...data };
    payload.estimated_page_count = payload.page_count;
    const created = await base44.entities.WebsiteProject.create(payload);
    setData((prev) => ({ ...prev, ...created }));
    saveAppState("webProjectDraft", created.id);
    queryClient.invalidateQueries({ queryKey: ["web-projects"] });
    return created;
  };

  // GENERATE — arka plan işlem yöneticisi üzerinden; sayfa/modal kapansa bile devam eder
  const generate = async (revisionFeedback) => {
    let projectId = data.id;
    if (!projectId) {
      const created = await ensureCreated();
      projectId = created.id;
    }

    setData((p) => ({ ...p, generation_status: "generating", delivery_status: "Analiz Aşamasında" }));
    setIsGenerating(true);

    runJob(
      () => runWebsiteArchitectureJob(projectId, revisionFeedback),
      {
        title: revisionFeedback ? "Web mimarisi revize ediliyor" : "Web mimarisi oluşturuluyor",
        page: data.project_name || data.company_name || "Web Projesi",
        href: "/web-projeleri",
      },
      (err, updated) => {
        // Sayfa hâlâ açıksa local state'i güncelle
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ["web-projects"] });
        if (err) {
          setData((p) => ({ ...p, generation_status: "error" }));
          const msg = err.message || "bilinmeyen hata";
          toast.error(msg.includes("60sn") || msg.includes("AbortError")
            ? "AI yanıt vermedi. Tekrar deneyin."
            : "Üretim başarısız: " + msg);
        } else {
          setData(updated);
          toast.success(revisionFeedback ? "Mimari güncellendi!" : "Mimari ve prompt hazır!");
        }
      }
    );
  };

  const updateDeliveryStatus = async (newStatus) => {
    if (!data.id) return;
    await base44.entities.WebsiteProject.update(data.id, { delivery_status: newStatus });
    setData((prev) => ({ ...prev, delivery_status: newStatus }));
    queryClient.invalidateQueries({ queryKey: ["web-projects"] });
    toast.success("Durum güncellendi");
  };

  const canNext = () => {
    if (step === 1) return data.company_id && data.project_name;
    return true;
  };

  /**
   * HATA YAKALAMA YOKTU ve düğme "çalışmıyor" görünüyordu.
   *
   * ensureCreated() bir hata fırlattığında (ör. tabloda olmayan bir alan
   * gönderildiğinde PostgREST tüm insert'i reddediyor) promise reddediyor,
   * yakalayan olmadığı için ekranda hiçbir iz kalmıyor, adım da ilerlemiyordu.
   * Kullanıcı düğmeye basıp hiçbir şey olmadığını görüyordu.
   */
  const [ilerliyor, setIlerliyor] = useState(false);

  const goNext = async () => {
    setIlerliyor(true);
    try {
      if (step === 1) {
        await ensureCreated();
        setStep(2);
      } else if (step === 2) {
        // Pending debounce kaydını zorla
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        if (data.id) {
          const toSave = { ...data };
          toSave.estimated_page_count = toSave.page_count;
          await base44.entities.WebsiteProject.update(data.id, toSave);
        }
        setStep(3);
      }
    } catch (e) {
      console.error("[WebProjectWizard] ilerleme hatası:", e);
      toast.error("Devam edilemedi", {
        description: e?.message || "Bilinmeyen hata",
        duration: 8000,
      });
    } finally {
      setIlerliyor(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between gap-2">
            <span>{project?.id ? "Projeyi Düzenle" : "Yeni Web Sitesi Projesi"}</span>
            {isSaving && (
              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <Save className="w-3 h-3 animate-pulse" /> Kaydediliyor...
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 py-2">
          {STEPS.map((s, idx) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <React.Fragment key={s.num}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive ? "bg-orange-500 text-white" :
                  isDone ? "bg-emerald-100 text-emerald-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isActive ? "bg-white text-orange-500" :
                    isDone ? "bg-emerald-500 text-white" :
                    "bg-background"
                  }`}>
                    {isDone ? <Check className="w-3 h-3" /> : s.num}
                  </div>
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
                {idx < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-muted" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Content */}
        <div className="py-4">
          {isGenerating ? (
            <GenerationProgress />
          ) : (
            <>
              {step === 1 && <WizardStep1 data={data} setData={updateData} companies={companies} />}
              {step === 2 && <WizardStep2 data={data} setData={updateData} />}
              {step === 3 && (
                <WizardStep3
                  project={data}
                  onGenerate={generate}
                  onUpdateStatus={updateDeliveryStatus}
                  isGenerating={isGenerating}
                />
              )}
            </>
          )}
        </div>

        {/* Nav */}
        {!isGenerating && step < 3 && (
          <div className="flex justify-between gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {step === 1 ? "Kapat" : "Geri"}
            </Button>
            <Button
              onClick={goNext}
              disabled={!canNext() || ilerliyor}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {ilerliyor ? "Kaydediliyor…" : "İleri"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
        {!isGenerating && step === 3 && (
          <div className="flex justify-between gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Geri
            </Button>
            <Button onClick={() => onOpenChange(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="w-4 h-4 mr-1" /> Tamamla & Kapat
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}