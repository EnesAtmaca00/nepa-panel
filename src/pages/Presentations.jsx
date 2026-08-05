// /sunumlar — Liste + oluşturucu + çıktı görüntüleme
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";
import PresentationInput from "@/components/presentations/PresentationInput";
import PresentationQuestions from "@/components/presentations/PresentationQuestions";
import PresentationLoading from "@/components/presentations/PresentationLoading";
import PresentationOutput from "@/components/presentations/PresentationOutput";
import PresentationCard from "@/components/presentations/PresentationCard";
import {
  askMissingInfo,
  generatePresentation,
  logDeployerStep,
  newWorkflowId,
} from "@/lib/presentationAI";
import {
  buildPresentationContext,
  buildPresentationSystemPrompt,
  runPresentationAudit,
} from "@/lib/presentationContext";
import { setActiveTask, clearActiveTask, saveAppState, loadAppState, clearAppState } from "@/lib/appState";

// View states: "list" | "input" | "questions" | "loading" | "output"

export default function Presentations() {
  const qc = useQueryClient();
  const [view, setView] = useState("list");
  const [loadingStep, setLoadingStep] = useState("research");

  // Form state ara aşamalar arası
  const [draftContext, setDraftContext] = useState(null); // { inputText, company, meetingDate, mode }
  const [questions, setQuestions] = useState([]);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [activePresentation, setActivePresentation] = useState(null);

  const { data: settings = {} } = useQuery({
    queryKey: ["app-settings-presentations"],
    queryFn: async () => (await base44.entities.AppSettings.list())?.[0] || {},
    initialData: {},
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const { data: presentations = [], isLoading } = useQuery({
    queryKey: ["presentations"],
    queryFn: () => base44.entities.Presentation.filter({ deleted: false }, "-updated_date", 200),
    initialData: [],
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  const resetToList = () => {
    setView("list");
    setDraftContext(null);
    setQuestions([]);
    setDetectedInfo(null);
    setActivePresentation(null);
    clearAppState("presentationDraft");
  };

  // SORUN 2: Sayfa açılınca son draft sunumunu yüklenebilir hale getir
  useEffect(() => {
    const draftId = loadAppState("presentationDraft");
    if (draftId && presentations.length > 0) {
      const found = presentations.find((p) => p.id === draftId);
      if (found && found.status === "draft") {
        setActivePresentation(found);
        // Liste görünümünde kalıyoruz; kullanıcı kartına tıklarsa açılır
      } else {
        clearAppState("presentationDraft");
      }
    }
  }, [presentations]);

  // DÜZELTME 4: Bozuk taslakları tespit et (slides boş veya generation_status=error)
  const bozukTaslaklar = React.useMemo(() => {
    return (presentations || []).filter(
      (p) =>
        (!Array.isArray(p.slides) || p.slides.length === 0) &&
        p.generation_status !== "generating"
    );
  }, [presentations]);

  // Adım 1 → Adım 2 (sorular veya direkt üretim)
  const handleInputSubmit = async (ctx) => {
    // ctx artık logoUrl + logoSource da içeriyor
    setDraftContext(ctx);
    if (ctx.mode === "ask") {
      setView("loading");
      setLoadingStep("research");
      try {
        const wfId = newWorkflowId();
        const research = await askMissingInfo({
          inputText: ctx.inputText,
          settings,
          workflowId: wfId,
        });
        setDetectedInfo(research);
        setQuestions(research.sorular || []);
        if ((research.sorular || []).length === 0) {
          // Soru yoksa direkt üret
          await runGeneration({ ...ctx, research, workflowId: wfId, answers: [] });
        } else {
          setDraftContext({ ...ctx, workflowId: wfId, research });
          setView("questions");
        }
      } catch (e) {
        toast.error("Analiz hatası: " + e.message);
        setView("input");
      }
    } else {
      // Direkt üret
      const wfId = newWorkflowId();
      await runGeneration({ ...ctx, workflowId: wfId, research: null, answers: [] });
    }
  };

  const handleQuestionsSubmit = async (answers) => {
    await runGeneration({
      ...draftContext,
      research: draftContext.research,
      answers,
      workflowId: draftContext.workflowId,
    });
  };

  // Ana üretim fonksiyonu — Multi-tenant ajan zinciri
  const runGeneration = async ({ inputText, company, meetingDate, research, answers, workflowId, logoUrl, logoSource }) => {
    setView("loading");
    setLoadingStep("draft");
    setActiveTask({ tip: "presentation", mesaj: "Sunum hazırlanıyor..." });

    try {
      // ── AJAN 1: RESEARCHER — Firma bağlamını topla ──
      const ctx = await buildPresentationContext(inputText, company, settings);

      const musteri_adi = research?.musteri_adi || ctx.firma_adi || "Müşteri";
      const konum = research?.konum || ctx.ulke || "";
      const sektor = research?.sektor || ctx.sektor || "";
      const hizmetler = research?.tespit_edilen_hizmetler || company?.agreed_services || [];
      const ek_bilgiler = (answers || []).filter(Boolean).join(" | ");

      // ── AJAN 2: DRAFTER — Dinamik system prompt ile üret ──
      const contextSystemPrompt = buildPresentationSystemPrompt(ctx);

      // Researcher output'unu drafter'a aktar (ctx'e enjekte et — buildSystemPrompt için)
      ctx.tespit_edilen_hizmetler = hizmetler;

      const draft = await generatePresentation({
        inputText,
        musteri_adi,
        konum,
        sektor,
        hizmetler,
        ek_bilgiler,
        meeting_date: meetingDate,
        agency_name: ctx.ajansi_adi,
        agency_email: ctx.ajansi_email,
        agency_phone: ctx.ajansi_tel,
        brandVoiceSummary: ctx.ton_sifatlari.join(", "),
        colorPalette: ctx.renkler,
        settings,
        workflowId,
        contextSystemPrompt,
      });

      setLoadingStep("deploy");

      // DÜZELTME: slides boş bile olsa MUTLAKA kaydet — kullanıcı "tekrar dene" görebilsin
      const safeSlides = Array.isArray(draft?.slides) ? draft.slides : [];

      // ── AJAN 3: AUDITOR — Yasak kelime kontrolü + skor ──
      const audit = runPresentationAudit(
        { ...draft, slides: safeSlides },
        ctx
      );
      const finalSlides = Array.isArray(audit.parsed?.slides) ? audit.parsed.slides : safeSlides;

      // ── AJAN 4: DEPLOYER — Kaydet (slides boş olsa bile) ──
      const isEmpty = finalSlides.length === 0;
      const generationStatus = isEmpty ? "error" : (finalSlides.length < 4 ? "partial" : "completed");

      const created = await base44.entities.Presentation.create({
        client_name: musteri_adi,
        company_id: company?.id || null,
        location: konum,
        sector: sektor,
        raw_input: inputText,
        ai_questions: research?.sorular || [],
        ai_answers: answers || [],
        detected_services: hizmetler,
        meeting_date: meetingDate || null,
        title: draft.sunum_basligi || `${musteri_adi} Sunumu`,
        short_summary: draft.kisa_ozet || "",
        slides: finalSlides,
        project_timeline_summary: draft.proje_takvimi_ozeti || "",
        persuasion_arguments: draft.ikna_argumanlari || [],
        plain_text_version: draft.duz_metin_versiyonu || "",
        status: isEmpty ? "draft" : "ready",
        generation_status: generationStatus,
        version: 1,
        revision_count: 0,
        workflow_id: workflowId,
        audit_score: audit.score,
        logo_url: logoUrl || ctx.logo_url || company?.logo_url || null,
        color_palette: ctx.renkler || [],
        firma_baglam: {
          marka_sesi_kullanildi: !!ctx.marka_sesi,
          style_memory_kullanildi: !!ctx.gorsel_stil,
          sektor_icgoru_kullanildi: !!ctx.sektor_icgoru,
          zenginlestirme_kullanildi: !!ctx.zenginlestirme,
          yasak_bulunan: audit.yasak_bulunan,
          logo_source: logoSource || (company?.logo_url ? "company" : null),
          renkler: ctx.renkler || [],
        },
      });

      await logDeployerStep({
        workflowId,
        entityId: created.id,
        slideCount: finalSlides.length,
      });

      setActivePresentation(created);
      saveAppState("presentationDraft", created.id);
      qc.invalidateQueries({ queryKey: ["presentations"] });
      setView("output");
      if (isEmpty) {
        toast.error("Sunum içeriği boş döndü. 'Tekrar Dene' butonunu kullanın.");
      } else if (generationStatus === "partial") {
        toast.warning(`Sunum kısmen oluşturuldu (${finalSlides.length} slayt). Revize edebilirsiniz.`);
      } else {
        toast.success(`Sunum hazır! (Audit: ${audit.score}/100)`);
      }
    } catch (e) {
      toast.error("Sunum oluşturulamadı: " + e.message);
      setView("input");
    } finally {
      clearActiveTask();
    }
  };

  // DÜZELTME 3: Mevcut bir sunumu yeniden üret (input ile)
  const handleRetry = async (presentation) => {
    if (!presentation?.raw_input) {
      toast.error("Bu sunumda ham brief yok, yeniden üretilemez.");
      return;
    }
    const company = presentation.company_id
      ? await base44.entities.Company.get(presentation.company_id).catch(() => null)
      : null;
    setDraftContext({
      inputText: presentation.raw_input,
      company,
      meetingDate: presentation.meeting_date || "",
      logoUrl: presentation.logo_url,
      logoSource: presentation.firma_baglam?.logo_source || null,
    });
    await runGeneration({
      inputText: presentation.raw_input,
      company,
      meetingDate: presentation.meeting_date || "",
      research: null,
      answers: presentation.ai_answers || [],
      workflowId: newWorkflowId(),
      logoUrl: presentation.logo_url,
      logoSource: presentation.firma_baglam?.logo_source,
    });
  };

  // Revizyon — Multi-tenant bağlamlı
  const handleRevision = async (feedback) => {
    if (!activePresentation) return;
    try {
      const wfId = newWorkflowId();
      const company = activePresentation.company_id
        ? await base44.entities.Company.get(activePresentation.company_id).catch(() => null)
        : null;

      // Bağlamı yeniden topla (güncel veri)
      const ctx = await buildPresentationContext(
        activePresentation.raw_input || "",
        company,
        settings
      );
      const contextSystemPrompt = buildPresentationSystemPrompt(ctx);

      const draft = await generatePresentation({
        inputText: activePresentation.raw_input || "",
        musteri_adi: activePresentation.client_name,
        konum: activePresentation.location || "",
        sektor: activePresentation.sector || "",
        hizmetler: activePresentation.detected_services || [],
        ek_bilgiler: (activePresentation.ai_answers || []).join(" | "),
        meeting_date: activePresentation.meeting_date || "",
        agency_name: ctx.ajansi_adi,
        agency_email: ctx.ajansi_email,
        agency_phone: ctx.ajansi_tel,
        brandVoiceSummary: ctx.ton_sifatlari.join(", "),
        colorPalette: ctx.renkler,
        settings,
        workflowId: wfId,
        revisionFeedback: feedback,
        previousSlides: activePresentation.slides,
        contextSystemPrompt,
      });

      const safeSlides = Array.isArray(draft?.slides) ? draft.slides : [];
      const audit = runPresentationAudit({ ...draft, slides: safeSlides }, ctx);
      const finalSlides = Array.isArray(audit.parsed?.slides) ? audit.parsed.slides : safeSlides;

      const newVersion = (activePresentation.version || 1) + 1;
      const newCount = (activePresentation.revision_count || 0) + 1;
      await base44.entities.Presentation.update(activePresentation.id, {
        slides: finalSlides,
        title: draft.sunum_basligi,
        short_summary: draft.kisa_ozet,
        plain_text_version: draft.duz_metin_versiyonu,
        project_timeline_summary: draft.proje_takvimi_ozeti,
        persuasion_arguments: draft.ikna_argumanlari || [],
        revision_feedback: feedback,
        revision_count: newCount,
        version: newVersion,
        workflow_id: wfId,
        audit_score: audit.score,
        firma_baglam: {
          marka_sesi_kullanildi: !!ctx.marka_sesi,
          style_memory_kullanildi: !!ctx.gorsel_stil,
          sektor_icgoru_kullanildi: !!ctx.sektor_icgoru,
          zenginlestirme_kullanildi: !!ctx.zenginlestirme,
          yasak_bulunan: audit.yasak_bulunan,
        },
      });

      const updated = {
        ...activePresentation,
        slides: finalSlides,
        title: draft.sunum_basligi,
        short_summary: draft.kisa_ozet,
        plain_text_version: draft.duz_metin_versiyonu,
        revision_count: newCount,
        version: newVersion,
        audit_score: audit.score,
        firma_baglam: {
          marka_sesi_kullanildi: !!ctx.marka_sesi,
          style_memory_kullanildi: !!ctx.gorsel_stil,
          sektor_icgoru_kullanildi: !!ctx.sektor_icgoru,
          zenginlestirme_kullanildi: !!ctx.zenginlestirme,
          yasak_bulunan: audit.yasak_bulunan,
        },
      };
      setActivePresentation(updated);
      qc.invalidateQueries({ queryKey: ["presentations"] });
      toast.success(`Revizyon tamam (v${newVersion}, Audit: ${audit.score}/100)`);
    } catch (e) {
      toast.error("Revizyon hatası: " + e.message);
    }
  };

  // ---- Render ----

  if (view === "input") {
    return (
      <div className="py-4">
        <PresentationInput onCancel={resetToList} onSubmit={handleInputSubmit} />
      </div>
    );
  }

  if (view === "questions") {
    return (
      <div className="py-4">
        <PresentationQuestions
          questions={questions}
          detected={detectedInfo}
          onBack={() => setView("input")}
          onSubmit={handleQuestionsSubmit}
        />
      </div>
    );
  }

  if (view === "loading") {
    return (
      <div className="py-4">
        <PresentationLoading currentStep={loadingStep} />
      </div>
    );
  }

  if (view === "output" && activePresentation) {
    return (
      <div className="py-4">
        <PresentationOutput
          presentation={activePresentation}
          onBack={resetToList}
          onRevise={handleRevision}
          onUpdateLocal={setActivePresentation}
          onRetry={() => handleRetry(activePresentation)}
        />
      </div>
    );
  }

  // Liste görünümü
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            🎯 Sunumlar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Müşteri ziyaretleri için profesyonel sunum üret
          </p>
        </div>
        <Button onClick={() => setView("input")} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Yeni Sunum Oluştur
        </Button>
      </div>

      {/* DÜZELTME 4: Bozuk taslak uyarısı */}
      {bozukTaslaklar.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 text-amber-900 rounded-lg p-3 text-sm flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <div className="flex-1">
            <p className="font-medium">
              {bozukTaslaklar.length} adet tamamlanmamış sunum var
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              İçeriği boş kalmış. Kartına girip yeniden oluşturabilirsiniz veya silebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Yükleniyor...</div>
      ) : presentations.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Target className="w-16 h-16 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">Henüz sunum oluşturulmadı</h3>
          <p className="text-sm text-muted-foreground">Müşteri toplantısı öncesi hızlıca sunum hazırla</p>
          <Button onClick={() => setView("input")} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> İlk sunumunu oluştur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {presentations.map((p) => (
            <PresentationCard
              key={p.id}
              presentation={p}
              onView={(pres) => {
                setActivePresentation(pres);
                setView("output");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}