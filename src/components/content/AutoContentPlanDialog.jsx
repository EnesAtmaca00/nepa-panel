import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useJobs } from "@/lib/JobsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, CalendarCheck, Check, ChevronDown, ChevronUp, Wand2 } from "lucide-react";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/format";
import { toast } from "sonner";

const TONES = ["samimi", "resmi", "esprili", "cesur", "bilgilendirici", "motive"];

export default function AutoContentPlanDialog({ open, onOpenChange, companies }) {
  const queryClient = useQueryClient();
  const { runJob, getJobByKey } = useJobs();
  const jobKey = "auto_content_plan";
  const [generating, setGenerating] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [periodWeeks, setPeriodWeeks] = useState(4);
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [selectedPlatforms, setSelectedPlatforms] = useState(["instagram_post"]);
  const [languages, setLanguages] = useState(["TR"]);
  const [tone, setTone] = useState("samimi");
  const [useCompetitor, setUseCompetitor] = useState(true);
  const [useStyle, setUseStyle] = useState(true);

  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingAll, setSavingAll] = useState(false);

  const togglePlatform = (p) =>
    setSelectedPlatforms(arr => arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p]);

  // Modal açıldığında: arka planda süren/biten planı geri yükle
  useEffect(() => {
    if (!open) return;
    const job = getJobByKey(jobKey);
    if (!job) return;
    if (job.status === "running") {
      setGenerating(true);
    } else if (job.status === "done" && job.result) {
      setGenerating(false);
      setGeneratedPlan(job.result);
      setExpandedIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runGenerate = () => {
    setGenerating(true);
    const company = companies.find(c => c.id === companyId);
    runJob(
      async () => {
        const res = await base44.functions.invoke("generateContentPlan", {
          company_id: companyId,
          period_weeks: periodWeeks,
          posts_per_week: postsPerWeek,
          platforms: selectedPlatforms,
          languages,
          tone,
          use_competitor_data: useCompetitor,
          use_style_memory: useStyle,
        });
        if (res?.data?.error) throw new Error(res.data.error);
        return res.data;
      },
      { key: jobKey, title: "İçerik planı oluşturuluyor", page: `${company?.name || ""} · ${periodWeeks * postsPerWeek} içerik`, href: "/icerik-takvimi" },
      (err, data) => {
        setGenerating(false);
        if (err) { toast.error("Hata: " + err.message); return; }
        setGeneratedPlan(data);
        setSavedIds(new Set());
        setExpandedIdx(0);
        toast.success(`${data?.posts?.length || 0} içerik planlandı!`);
      }
    );
  };

  const savePost = async (post) => {
    const company = companies.find(c => c.id === companyId);
    await base44.entities.ContentIdea.create({
      company_id: companyId,
      company_name: company?.name,
      title: post.title,
      platform: post.platform || selectedPlatforms[0],
      format: post.content_type,
      hook: post.hook,
      generated_brief: (post.brief || "") + (post.visual_suggestion ? `\n\nGörsel Önerisi: ${post.visual_suggestion}` : ""),
      caption: post.caption || "",
      hashtags: post.hashtags || [],
      scheduled_date: post.scheduled_date,
      work_status: "not_started",
      approval_mode: company?.default_approval_mode || "manual_internal",
      approval_status: company?.default_approval_mode === "none" ? "approved" : "pending_internal",
    });
    setSavedIds(prev => new Set([...prev, post.index]));
    queryClient.invalidateQueries({ queryKey: ["all-ideas"] });
  };

  const saveAllPosts = async () => {
    if (!generatedPlan?.posts?.length) return;
    setSavingAll(true);
    const unsaved = generatedPlan.posts.filter(p => !savedIds.has(p.index));
    for (const post of unsaved) {
      await savePost(post);
    }
    setSavingAll(false);
    toast.success("Tüm içerikler takvime eklendi!");
    queryClient.invalidateQueries({ queryKey: ["all-ideas"] });
  };

  const handleClose = (v) => {
    if (!v) {
      setGeneratedPlan(null);
      setSavedIds(new Set());
      setExpandedIdx(null);
    }
    onOpenChange(v);
  };

  const company = companies.find(c => c.id === companyId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-gold" />
            Otomatik İçerik Planı Oluştur
          </DialogTitle>
        </DialogHeader>

        {!generatedPlan ? (
          <div className="space-y-5">
            {/* Firma */}
            <div>
              <Label className="mb-1.5 block">Firma</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Firma seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {company && (
                <p className="text-xs text-muted-foreground mt-1">
                  {company.sector} • {company.target_audience || "Hedef kitle bilgisi yok"}
                </p>
              )}
            </div>

            {/* Süre ve sıklık */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Plan Süresi</Label>
                <Select value={String(periodWeeks)} onValueChange={v => setPeriodWeeks(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Hafta</SelectItem>
                    <SelectItem value="2">2 Hafta</SelectItem>
                    <SelectItem value="4">4 Hafta (1 Ay)</SelectItem>
                    <SelectItem value="8">8 Hafta (2 Ay)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Haftalık Post Sayısı</Label>
                <Select value={String(postsPerWeek)} onValueChange={v => setPostsPerWeek(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} post/hafta</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
              Toplam <strong className="text-foreground">{periodWeeks * postsPerWeek} içerik</strong> oluşturulacak ve takvime eklenecek.
            </div>

            {/* Platformlar */}
            <div>
              <Label className="mb-2 block">Platformlar</Label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.slice(0, 7).map(p => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-2 py-1 text-xs rounded-md border transition-all ${
                      selectedPlatforms.includes(p) ? "bg-gold text-slate-900 border-gold" : "bg-background hover:bg-muted"
                    }`}
                  >{PLATFORM_LABELS[p]}</button>
                ))}
              </div>
            </div>

            {/* Dil ve ton */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Diller</Label>
                <div className="flex gap-1.5">
                  {["TR", "NL", "FR", "EN"].map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguages(arr => arr.includes(l) ? arr.filter(x => x !== l) : [...arr, l])}
                      className={`px-2 py-1 text-xs rounded-md border ${
                        languages.includes(l) ? "bg-gold text-slate-900 border-gold" : "bg-background"
                      }`}
                    >{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Ton</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seçenekler */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setUseCompetitor(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${
                  useCompetitor ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-background"
                }`}
              >
                {useCompetitor && <Check className="w-3 h-3" />} Rakip verilerini kullan
              </button>
              <button
                onClick={() => setUseStyle(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${
                  useStyle ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-background"
                }`}
              >
                {useStyle && <Check className="w-3 h-3" />} Tarz hafızasını kullan
              </button>
            </div>

            <Button
              onClick={runGenerate}
              disabled={generating || !companyId || selectedPlatforms.length === 0}
              className="w-full bg-gold text-slate-900 hover:bg-gold/90 h-11"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Plan oluşturuluyor ({periodWeeks * postsPerWeek} içerik)... (arka planda devam eder)</>
                : <><Sparkles className="w-4 h-4 mr-2" /> Otomatik Plan Oluştur</>
              }
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Plan özeti */}
            <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg">
              <h3 className="font-semibold text-sm">{generatedPlan.plan_title}</h3>
              {generatedPlan.plan_summary && (
                <p className="text-xs text-muted-foreground mt-1">{generatedPlan.plan_summary}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{generatedPlan.posts?.length || 0} içerik</Badge>
                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                  {savedIds.size} takvime eklendi
                </Badge>
              </div>
            </div>

            {/* Toplu kaydet */}
            {savedIds.size < (generatedPlan.posts?.length || 0) && (
              <Button
                onClick={saveAllPosts}
                disabled={savingAll}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingAll
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</>
                  : <><CalendarCheck className="w-4 h-4" /> Tümünü Takvime Ekle ({(generatedPlan.posts?.length || 0) - savedIds.size} içerik)</>
                }
              </Button>
            )}

            {/* İçerik listesi */}
            <div className="space-y-2">
              {(generatedPlan.posts || []).map((post, idx) => (
                <Card key={idx} className={`transition-all ${savedIds.has(post.index) ? "opacity-60" : ""}`}>
                  <CardContent className="p-3">
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                          {post.index}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{post.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{post.scheduled_date}</span>
                            <Badge variant="outline" className="text-[10px] py-0">{PLATFORM_LABELS[post.platform] || post.platform}</Badge>
                            {post.content_type && <Badge variant="secondary" className="text-[10px] py-0">{post.content_type}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {savedIds.has(post.index) ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                            <Check className="w-3 h-3 mr-1" /> Eklendi
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => { e.stopPropagation(); savePost(post); }}
                          >
                            + Ekle
                          </Button>
                        )}
                        {expandedIdx === idx
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {expandedIdx === idx && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        {post.hook && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hook</span>
                            <p className="text-sm font-medium mt-0.5">{post.hook}</p>
                          </div>
                        )}
                        {post.caption && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Caption</span>
                            <p className="text-sm mt-0.5 whitespace-pre-line border-l-2 border-gold pl-2">{post.caption}</p>
                          </div>
                        )}
                        {post.hashtags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.hashtags.map((h, i) => (
                              <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                {h.startsWith("#") ? h : `#${h}`}
                              </span>
                            ))}
                          </div>
                        )}
                        {post.visual_suggestion && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Görsel Önerisi</span>
                            <p className="text-xs mt-0.5 text-muted-foreground bg-muted/40 p-2 rounded">{post.visual_suggestion}</p>
                          </div>
                        )}
                        {post.brief && (
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Brief / Notlar</span>
                            <p className="text-xs mt-0.5 text-muted-foreground">{post.brief}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setGeneratedPlan(null)}>
              ← Yeni Plan Oluştur
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}