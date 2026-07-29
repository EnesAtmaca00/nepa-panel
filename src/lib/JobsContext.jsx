import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

/**
 * Global arka plan işlem yöneticisi.
 *
 * Amaç: Uzun süren işlemler (AI üretimi vb.) sayfa değiştirilse bile arka planda
 * devam etsin. Bu context, uygulamanın en üstünde (route'ların dışında) yaşadığı
 * için sayfa geçişlerinde unmount OLMAZ — bu yüzden başlatılan promise'ler kesintisiz
 * çalışmaya devam eder. Kullanıcı sayfaya geri döndüğünde devam eden işlemi veya
 * biten çıktıyı global panelden görebilir.
 */

const JobsContext = createContext(null);

const STORAGE_KEY = "nepa_bg_jobs";
let jobSeq = 0;

// Biten işlem çıktısını sessionStorage'a yazarak yenileme sonrası korumaya çalışırız.
function persist(jobs) {
  try {
    const slim = jobs
      .filter((j) => j.status === "done" || j.status === "error")
      .slice(0, 30)
      .map((j) => ({
        id: j.id,
        key: j.key,
        title: j.title,
        page: j.page,
        href: j.href,
        status: j.status,
        result: j.result,
        error: j.error,
        startedAt: j.startedAt,
        finishedAt: j.finishedAt,
        seen: j.seen,
      }));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch (_) {}
}

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function JobsProvider({ children }) {
  const [jobs, setJobs] = useState(() => loadPersisted());
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const updateJob = useCallback((id, patch) => {
    setJobs((prev) => {
      const next = prev.map((j) => (j.id === id ? { ...j, ...patch } : j));
      persist(next);
      return next;
    });
  }, []);

  /**
   * Bir async fonksiyonu arka planda çalıştırır.
   * @param {Function} fn - async () => result  (await edilecek)
   * @param {Object} meta - { title, page, href }
   * @param {Function} [onDone] - opsiyonel; sonuç hazır olunca çağrılır (sayfa hâlâ mount ise)
   * @returns {string} jobId
   */
  const runJob = useCallback((fn, meta = {}, onDone) => {
    const id = `job_${Date.now()}_${jobSeq++}`;
    const job = {
      id,
      key: meta.key || null, // sayfa bazlı kimlik — geri dönünce durumu eşleştirmek için
      title: meta.title || "İşlem",
      page: meta.page || "",
      href: meta.href || "",
      status: "running",
      result: null,
      error: null,
      startedAt: Date.now(),
      finishedAt: null,
      seen: false,
    };

    setJobs((prev) => {
      // Aynı key için eski (biten) kayıtları temizle — tek aktif kayıt kalsın
      const cleaned = meta.key ? prev.filter((j) => !(j.key === meta.key && j.status !== "running")) : prev;
      const next = [job, ...cleaned].slice(0, 40);
      return next;
    });

    Promise.resolve()
      .then(() => fn())
      .then((result) => {
        updateJob(id, { status: "done", result, finishedAt: Date.now() });
        if (onDone) {
          try { onDone(null, result); } catch (_) {}
        }
      })
      .catch((err) => {
        updateJob(id, {
          status: "error",
          error: err?.message || "Bilinmeyen hata",
          finishedAt: Date.now(),
        });
        if (onDone) {
          try { onDone(err, null); } catch (_) {}
        }
      });

    return id;
  }, [updateJob]);

  const markSeen = useCallback((id) => {
    updateJob(id, { seen: true });
  }, [updateJob]);

  const dismissJob = useCallback((id) => {
    setJobs((prev) => {
      const next = prev.filter((j) => j.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clearFinished = useCallback(() => {
    setJobs((prev) => {
      const next = prev.filter((j) => j.status === "running");
      persist(next);
      return next;
    });
  }, []);

  const getJob = useCallback((id) => jobsRef.current.find((j) => j.id === id) || null, []);

  // Sayfa bazlı kimlikle en güncel işi bul (running öncelikli, yoksa en son biten).
  // Component yeniden mount olduğunda devam eden/biten durumu geri yüklemek için.
  const getJobByKey = useCallback((key) => {
    if (!key) return null;
    const matches = jobsRef.current.filter((j) => j.key === key);
    if (matches.length === 0) return null;
    return matches.find((j) => j.status === "running") || matches[0];
  }, []);

  // Sayfa kapatılırken devam eden işlem varsa uyar
  useEffect(() => {
    const handler = (e) => {
      if (jobsRef.current.some((j) => j.status === "running")) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const value = {
    jobs,
    runJob,
    markSeen,
    dismissJob,
    clearFinished,
    getJob,
    getJobByKey,
    runningCount: jobs.filter((j) => j.status === "running").length,
    unseenDone: jobs.filter((j) => (j.status === "done" || j.status === "error") && !j.seen).length,
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}