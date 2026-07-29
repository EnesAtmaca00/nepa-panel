import React, { useState } from "react";
import { useJobs } from "@/lib/JobsContext";
import { Link } from "react-router-dom";
import {
  Loader2, CheckCircle2, AlertTriangle, X, ChevronDown, ChevronUp,
  Activity, ArrowRight, Trash2,
} from "lucide-react";

function elapsed(start, end) {
  const ms = (end || Date.now()) - start;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}sn`;
  return `${Math.floor(s / 60)}dk ${s % 60}sn`;
}

export default function BackgroundJobsPanel() {
  const { jobs, runningCount, unseenDone, markSeen, dismissJob, clearFinished } = useJobs();
  const [open, setOpen] = useState(false);

  if (jobs.length === 0) return null;

  const badge = runningCount > 0 ? runningCount : unseenDone;

  return (
    <div className="fixed bottom-36 lg:bottom-[92px] right-4 z-[60] w-[330px] max-w-[calc(100vw-2rem)]">
      {/* Açık panel */}
      {open && (
        <div className="mb-2 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/40">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="w-4 h-4 text-orange-500" />
              Arka Plan İşlemleri
            </div>
            <div className="flex items-center gap-1">
              {jobs.some((j) => j.status !== "running") && (
                <button
                  onClick={clearFinished}
                  className="text-muted-foreground hover:text-foreground p-1"
                  title="Bitenleri temizle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto scrollbar-thin divide-y divide-border">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onMarkSeen={markSeen} onDismiss={dismissJob} />
            ))}
          </div>
        </div>
      )}

      {/* Tetikleyici buton */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-auto flex items-center gap-2 bg-background border border-border shadow-lg rounded-full pl-3 pr-3 py-2 hover:shadow-xl transition-shadow"
      >
        {runningCount > 0 ? (
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        )}
        <span className="text-xs font-medium">
          {runningCount > 0 ? `${runningCount} işlem sürüyor` : "İşlemler"}
        </span>
        {badge > 0 && (
          <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

function JobRow({ job, onMarkSeen, onDismiss }) {
  const isRunning = job.status === "running";
  const isError = job.status === "error";

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex-shrink-0">
          {isRunning && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
          {job.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {isError && <AlertTriangle className="w-4 h-4 text-rose-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-tight truncate">{job.title}</div>
          {job.page && <div className="text-[11px] text-muted-foreground truncate">{job.page}</div>}

          <div className="flex items-center gap-2 mt-1 text-[11px]">
            {isRunning && <span className="text-orange-600">Sürüyor · {elapsed(job.startedAt)}</span>}
            {job.status === "done" && <span className="text-emerald-600">Tamamlandı · {elapsed(job.startedAt, job.finishedAt)}</span>}
            {isError && <span className="text-rose-600 truncate">Hata: {job.error}</span>}
          </div>

          {/* Sonucu görmeye git linki */}
          {!isRunning && job.href && (
            <Link
              to={job.href}
              onClick={() => onMarkSeen(job.id)}
              className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-orange-600 hover:text-orange-700"
            >
              Sonucu gör <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {!isRunning && (
          <button
            onClick={() => onDismiss(job.id)}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}