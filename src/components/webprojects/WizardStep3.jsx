import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Copy, Check, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DELIVERY_STATUSES, DELIVERY_STATUS_COLORS, AI_TOOLS } from "./webProjectConstants";

const LOADING_STEPS = [
  "🤖 Ajan devreye girdi...",
  "🔍 Sektör analizi yapılıyor...",
  "🏗️ Mimari kurgulanıyor...",
  "✍️ Taslak metinler üretiliyor...",
  "🎨 Renk paleti ve fontlar belirleniyor...",
  "🚀 AI prompt hazırlanıyor...",
];

export default function WizardStep3({ project, onGenerate, onUpdateStatus, isGenerating }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionText, setRevisionText] = useState("");
  const [expandedPage, setExpandedPage] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      const id = setInterval(() => {
        setStepIdx(i => (i + 1) % LOADING_STEPS.length);
      }, 1500);
      return () => clearInterval(id);
    }
  }, [isGenerating]);

  const status = project?.generation_status || "idle";
  const arch = project?.architecture;
  const prompts = project?.generated_prompts;

  const copyPrompt = () => {
    if (!prompts?.main_prompt) return;
    const text = `${prompts.main_prompt}\n\n${(prompts.page_prompts || []).map(p => `\n### ${p.page_title}\n${p.prompt}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Prompt kopyalandı!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevise = () => {
    onGenerate(revisionText.trim() || undefined);
    setRevisionMode(false);
    setRevisionText("");
  };

  // === LOADING STATE ===
  if (isGenerating || status === "generating") {
    return (
      <div className="py-16 text-center space-y-6">
        <div className="relative inline-block">
          <Loader2 className="w-16 h-16 animate-spin text-orange-500 mx-auto" />
          <Sparkles className="w-6 h-6 text-orange-400 absolute top-0 right-0 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Yapay Zeka Çalışıyor</h3>
          <p className="text-orange-600 font-medium animate-pulse">{LOADING_STEPS[stepIdx]}</p>
          <p className="text-xs text-muted-foreground">Bu işlem 30-60 saniye sürebilir...</p>
        </div>
      </div>
    );
  }

  // === IDLE STATE: Generate button ===
  if (status === "idle" || !arch) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-orange-100 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-orange-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Mimari & Prompt Üretimine Hazır</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            AI, firma bilgilerinizi ve özelliklerinizi analiz edip profesyonel bir web mimarisi ve seçilen araca özel prompt üretecek.
          </p>
        </div>
        <Button
          onClick={() => onGenerate()}
          size="lg"
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Analiz Et & Mimari Oluştur
        </Button>
      </div>
    );
  }

  // === COMPLETED STATE ===
  const toolLabel = prompts?.tool_label || AI_TOOLS.find(t => t.id === project.ai_tool)?.label || "AI Aracı";

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
        <div className="text-sm">
          <span className="text-muted-foreground">Teslimat Durumu:</span>
        </div>
        <Select value={project.delivery_status || "Planlanıyor"} onValueChange={onUpdateStatus}>
          <SelectTrigger className={`w-56 ${DELIVERY_STATUS_COLORS[project.delivery_status] || ""}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DELIVERY_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="architecture">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="architecture">📐 Web Sitesi Mimarisi</TabsTrigger>
          <TabsTrigger value="prompt">🚀 AI Prompt</TabsTrigger>
        </TabsList>

        {/* ARCHITECTURE */}
        <TabsContent value="architecture" className="space-y-3 mt-4">
          <div className="space-y-2">
            {(arch.pages || []).map((page, idx) => {
              const open = expandedPage === idx;
              return (
                <Card key={idx} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedPage(open ? -1 : idx)}
                    className="w-full p-3 flex items-center gap-2 hover:bg-muted/40 transition-colors text-left"
                  >
                    {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="flex-1">
                      <div className="font-semibold">{page.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{page.slug}</div>
                    </div>
                  </button>
                  {open && (
                    <CardContent className="p-4 pt-0 space-y-3 border-t">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Amaç</div>
                        <p className="text-sm">{page.purpose}</p>
                      </div>

                      {page.sections && page.sections.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bölümler</div>
                          <div className="space-y-2">
                            {page.sections.map((s, si) => (
                              <div key={si} className="p-3 rounded-lg bg-muted/30 border-l-4 border-orange-400">
                                <div className="font-medium text-sm">{s.name}</div>
                                <p className="text-xs text-muted-foreground mt-1">{s.content}</p>
                                {s.layout && (
                                  <div className="text-[10px] text-orange-600 mt-1 italic">Yerleşim: {s.layout}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {page.draft_texts && (
                        <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-1">
                          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Taslak Metinler</div>
                          {page.draft_texts.headline && (
                            <div><span className="text-xs text-muted-foreground">Başlık:</span> <span className="text-sm font-medium">{page.draft_texts.headline}</span></div>
                          )}
                          {page.draft_texts.subtext && (
                            <div><span className="text-xs text-muted-foreground">Alt metin:</span> <span className="text-sm">{page.draft_texts.subtext}</span></div>
                          )}
                          {page.draft_texts.cta && (
                            <div><span className="text-xs text-muted-foreground">CTA:</span> <span className="text-sm font-semibold text-emerald-700">{page.draft_texts.cta}</span></div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Meta info */}
          <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {arch.color_suggestion && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Renk Paleti</div>
                  <p className="mt-1">{arch.color_suggestion}</p>
                </div>
              )}
              {arch.font_suggestion && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Yazı Tipi</div>
                  <p className="mt-1">{arch.font_suggestion}</p>
                </div>
              )}
              {arch.seo_notes && (
                <div className="col-span-full">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SEO Notları</div>
                  <p className="mt-1">{arch.seo_notes}</p>
                </div>
              )}
              {arch.estimated_complexity && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Karmaşıklık</div>
                  <p className="mt-1 capitalize font-medium">{arch.estimated_complexity}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMPT */}
        <TabsContent value="prompt" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                {toolLabel} için hazırlandı
              </span>
            </div>
            <Button onClick={copyPrompt} size="sm" className="gap-2">
              {copied ? <><Check className="w-3.5 h-3.5" /> Kopyalandı!</> : <><Copy className="w-3.5 h-3.5" /> Kopyala</>}
            </Button>
          </div>

          <Textarea
            readOnly
            value={`${prompts.main_prompt || ""}\n\n${(prompts.page_prompts || []).map(p => `\n### ${p.page_title}\n${p.prompt}`).join("\n")}`}
            className="font-mono text-xs bg-slate-900 text-emerald-300 border-slate-700 min-h-[400px] resize-y"
          />
        </TabsContent>
      </Tabs>

      {/* REGENERATE & REVISION */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-600" /> Yeniden Oluştur
              {project.revision_count > 0 && (
                <span className="text-xs text-muted-foreground font-normal">({project.revision_count} kere revize edildi)</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => onGenerate()}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Tek Tuşla Yeniden Oluştur
            </Button>
          </div>

          {!revisionMode ? (
            <button
              onClick={() => setRevisionMode(true)}
              className="text-xs text-orange-600 hover:text-orange-800 underline underline-offset-2"
            >
              Değişiklik notu ekleyerek yeniden oluşturmak ister misin?
            </button>
          ) : (
            <div className="space-y-2 pt-1 border-t border-orange-200">
              <div className="text-xs text-muted-foreground">Opsiyonel: ne değişmeli?</div>
              <Textarea
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                placeholder="Örn: Anasayfada daha fazla bölüm olsun, e-ticaret bölümü kaldırılsın..."
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRevise} className="bg-orange-500 hover:bg-orange-600 gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Notla Yeniden Oluştur
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setRevisionMode(false); setRevisionText(""); }}>İptal</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}