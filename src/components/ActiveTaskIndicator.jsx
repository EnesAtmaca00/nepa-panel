// SORUN 4: Header'da aktif AI işlemi göstergesi
import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getActiveTask, subscribeActiveTask } from "@/lib/appState";

export default function ActiveTaskIndicator() {
  const [task, setTask] = useState(() => getActiveTask());

  useEffect(() => {
    const unsub = subscribeActiveTask((t) => setTask(t));
    // 30sn'de bir stale kontrol
    const interval = setInterval(() => {
      setTask(getActiveTask());
    }, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (!task) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full max-w-xs truncate">
      <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
      <span className="truncate">{task.mesaj}</span>
    </div>
  );
}