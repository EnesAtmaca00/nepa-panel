import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Clock, KeyRound, Wifi, FileWarning, CheckCircle2,
  RefreshCw, Trash2, ChevronDown, ChevronUp, ServerCrash
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const TYPE_META = {
  timeout: { label: "Zaman Aşımı", icon: Clock, cls: "bg-amber-50 border-amber-200 text-amber-700" },
  api_error: { label: "API Hatası", icon: Wifi, cls: "bg-rose-50 border-rose-200 text-rose-700" },
  parse_error: { label: "Yanıt Okunamadı", icon: FileWarning, cls: "bg-purple-50 border-purple-200 text-purple-700" },
  auth_error: { label: "Yetki Hatası", icon: KeyRound, cls: "bg-rose-50 border-rose-200 text-rose-700" },
  no_api_key: { label: "API Key Yok", icon: KeyRound, cls: "bg-orange-50 border-orange-200 text-orange-700" },
  other: { label: "Diğer", icon: ServerCrash, cls: "bg-slate-50 border-slate-200 text-slate-700" },
};

function ErrorRow({ log, onResolve, onDelete }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[log.error_type] || TYPE_META.other;
  const Icon = meta.icon;

  return (
    <Card className={`p-4 ${log.resolved ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{log.function_name}</span>
            {log.task_type && <Badge variant="secondary" className="text-[10px]">{log.task_type}</Badge>}
            <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
            {log.resolved && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 border-emerald-200 text-emerald-700">
                Çözüldü
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.error_message}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-mono">
            {log.model_used && <span>🤖 {log.model_used}</span>}
            {log.provider && <span>· {log.provider}</span>}
            <span>· {format(new Date(log.created_date), "d MMM HH:mm", { locale: tr })}</span>
          </div>

          {open && (
            <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
              <div>
                <span className="font-semibold">Tam Hata Mesajı:</span>
                <p className="mt-0.5 break-words whitespace-pre-wrap text-muted-foreground">{log.error_message}</p>
              </div>
              {log.context_info && (
                <div><span className="font-semibold">Bağlam:</span> <span className="text-muted-foreground">{log.context_info}</span></div>
              )}
              {log.prompt_preview && (
                <div>
                  <span className="font-semibold">Prompt Önizleme:</span>
                  <p className="mt-0.5 break-words text-muted-foreground italic">{log.prompt_preview}...</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <button onClick={() => setOpen(!open)} className="text-[11px] text-accent flex items-center gap-0.5 hover:underline">
              {open ? <><ChevronUp className="w-3 h-3" /> Gizle</> : <><ChevronDown className="w-3 h-3" /> Detay</>}
            </button>
            {!log.resolved && (
              <button onClick={() => onResolve(log.id)} className="text-[11px] text-emerald-600 flex items-center gap-0.5 hover:underline">
                <CheckCircle2 className="w-3 h-3" /> Çözüldü işaretle
              </button>
            )}
            <button onClick={() => onDelete(log.id)} className="text-[11px] text-rose-600 flex items-center gap-0.5 hover:underline">
              <Trash2 className="w-3 h-3" /> Sil
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AIErrorLogs() {
  const [filter, setFilter] = useState("all"); // all | unresolved

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["ai-error-logs"],
    queryFn: () => base44.entities.AIErrorLog.list("-created_date", 200),
    staleTime: 10000,
  });

  const filtered = filter === "unresolved" ? logs.filter(l => !l.resolved) : logs;
  const unresolvedCount = logs.filter(l => !l.resolved).length;

  const handleResolve = async (id) => {
    await base44.entities.AIErrorLog.update(id, { resolved: true });
    toast.success("Çözüldü olarak işaretlendi");
    refetch();
  };

  const handleDelete = async (id) => {
    await base44.entities.AIErrorLog.delete(id);
    refetch();
  };

  const handleClearResolved = async () => {
    const resolved = logs.filter(l => l.resolved);
    if (resolved.length === 0) return;
    await Promise.all(resolved.map(l => base44.entities.AIErrorLog.delete(l.id)));
    toast.success(`${resolved.length} çözülmüş kayıt silindi`);
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            AI Hata Günlüğü
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arka planda başarısız olan AI üretim işlemlerinin detayları.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Yenile
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearResolved}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Çözülenleri Temizle
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Tümü ({logs.length})
        </Button>
        <Button variant={filter === "unresolved" ? "default" : "outline"} size="sm" onClick={() => setFilter("unresolved")}>
          Çözülmemiş ({unresolvedCount})
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-medium">Hata kaydı yok</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "unresolved" ? "Çözülmemiş hata bulunmuyor." : "Henüz hiçbir AI üretim hatası kaydedilmedi."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((log) => (
            <ErrorRow key={log.id} log={log} onResolve={handleResolve} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}