import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Search, Trash2, ExternalLink, Calendar, Sparkles, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import HelpTooltip from "@/components/help/HelpTooltip";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import WebProjectWizard from "@/components/webprojects/WebProjectWizard";
import { DELIVERY_STATUS_COLORS } from "@/components/webprojects/webProjectConstants";
import { loadAppState, clearAppState } from "@/lib/appState";
import { autoFixStuckProjects } from "@/lib/systemHealth";
import { useJobs } from "@/lib/JobsContext";
import { runWebsiteArchitectureJob } from "@/lib/jobRunners";

export default function WebProjects() {
  const queryClient = useQueryClient();
  const { runJob } = useJobs();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["web-projects"],
    queryFn: () => base44.entities.WebsiteProject.list("-created_date", 200),
    initialData: [],
    refetchInterval: 8000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-for-web-projects"],
    queryFn: () => base44.entities.Company.filter({ deleted: false }, "name", 500),
    initialData: [],
  });

  const removeProject = useMutation({
    mutationFn: (id) => base44.entities.WebsiteProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-projects"] });
      toast.success("Proje silindi");
    },
  });

  // SORUN 2: Son draft veya error projeyi otomatik aç (sayfa açılınca)
  useEffect(() => {
    if (!projects.length) return;
    const draftId = loadAppState("webProjectDraft");
    if (draftId) {
      const found = projects.find((p) => p.id === draftId);
      if (found && (found.generation_status === "idle" || found.generation_status === "error")) {
        // Sessizce yükle, otomatik açma — kullanıcı tıklayınca açılsın
      } else {
        clearAppState("webProjectDraft");
      }
    }
  }, [projects]);

  // Sayfa açılınca 3dk+ takılı projeleri otomatik sıfırla
  useEffect(() => {
    (async () => {
      const fixed = await autoFixStuckProjects();
      if (fixed > 0) {
        toast.info(`${fixed} takılı proje sıfırlandı — tekrar deneyebilirsin`);
        queryClient.invalidateQueries({ queryKey: ["web-projects"] });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tek tuşla yeniden oluştur (kart üzerinden) — arka planda çalışır
  const quickRegenerate = (project) => {
    queryClient.invalidateQueries({ queryKey: ["web-projects"] });
    runJob(
      () => runWebsiteArchitectureJob(project.id),
      {
        title: "Web mimarisi yeniden oluşturuluyor",
        page: project.project_name || project.company_name || "Web Projesi",
        href: "/web-projeleri",
      },
      (err) => {
        queryClient.invalidateQueries({ queryKey: ["web-projects"] });
        if (err) toast.error("Üretim başarısız: " + (err.message || ""));
        else toast.success("Mimari yeniden oluşturuldu!");
      }
    );
    toast.info("Üretim arka planda başladı — başka sayfaya geçebilirsin");
  };

  // Error durumundaki projeyi tekrar dene
  const retryGeneration = async (project) => {
    setEditing(project);
    setWizardOpen(true);
  };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !search ||
        p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.company_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.delivery_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: projects.length, planning: 0, building: 0, delivered: 0 };
    projects.forEach((p) => {
      if (["Planlanıyor", "Analiz Aşamasında", "Mimari Hazırlandı"].includes(p.delivery_status)) s.planning++;
      else if (["Yapım Aşamasında", "Müşteri İncelemesinde", "Revizyon İstendi"].includes(p.delivery_status)) s.building++;
      else if (p.delivery_status === "Teslim Edildi") s.delivered++;
    });
    return s;
  }, [projects]);

  const openNew = () => {
    setEditing(null);
    setWizardOpen(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setWizardOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-7 h-7 text-orange-500" />
            Web Projeleri
            <HelpTooltip topic="web_architect" />
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Müşteriler için AI destekli web sitesi üretimi
          </p>
        </div>
        <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
          <Plus className="w-4 h-4" /> Yeni Proje
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Toplam Proje" value={stats.total} color="text-foreground" />
        <StatCard label="Planlama" value={stats.planning} color="text-blue-600" />
        <StatCard label="Yapım/İnceleme" value={stats.building} color="text-orange-600" />
        <StatCard label="Teslim Edildi" value={stats.delivered} color="text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Proje veya firma ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-transparent text-sm"
        >
          <option value="all">Tüm Durumlar</option>
          {Object.keys(DELIVERY_STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold mb-1">Henüz web projesi yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              İlk projeni oluşturmak için yukarıdaki butonu kullan
            </p>
            <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <Plus className="w-4 h-4" /> Yeni Proje
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={() => openEdit(p)}
              onRetry={() => retryGeneration(p)}
              onRegenerate={() => quickRegenerate(p)}
              isRegenerating={p.generation_status === "generating"}
              onDelete={() => {
                if (confirm("Bu projeyi silmek istediğine emin misin?")) {
                  removeProject.mutate(p.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Wizard */}
      <WebProjectWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        project={editing}
        companies={companies}
      />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project, onEdit, onRetry, onRegenerate, isRegenerating, onDelete }) {
  const statusColor = DELIVERY_STATUS_COLORS[project.delivery_status] || "bg-slate-100 text-slate-700 border-slate-200";
  const hasArch = !!project.architecture;
  const isError = project.generation_status === "error";

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={onEdit}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{project.project_name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.company_name}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-muted-foreground hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
          {project.delivery_status || "Planlanıyor"}
        </Badge>

        {/* SORUN 1D: error gösterimi + tekrar dene */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2 space-y-1.5">
            <div className="flex items-center gap-1 text-[11px] text-red-700">
              <AlertTriangle className="w-3 h-3" /> Üretim başarısız
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[11px] border-red-300 text-red-700 hover:bg-red-100"
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Tekrar Dene
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {project.site_type && (
            <Badge variant="secondary" className="text-[10px]">{project.site_type}</Badge>
          )}
          {project.page_count && (
            <Badge variant="secondary" className="text-[10px]">{project.page_count} sayfa</Badge>
          )}
          {hasArch && (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Mimari Hazır
            </Badge>
          )}
        </div>

        {/* Hızlı yeniden oluştur butonu */}
        {hasArch && !isError && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-[11px] border-orange-300 text-orange-700 hover:bg-orange-100 gap-1"
            disabled={isRegenerating}
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          >
            {isRegenerating
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Oluşturuluyor...</>
              : <><RefreshCw className="w-3 h-3" /> Yeniden Oluştur</>
            }
          </Button>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t">
          {project.deadline ? (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(project.deadline)}
            </span>
          ) : <span />}
          {project.production_url && (
            <a
              href={project.production_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
            >
              Canlı <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}