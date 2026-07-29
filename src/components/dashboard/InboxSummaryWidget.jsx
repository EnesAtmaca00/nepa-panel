import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Mail } from "lucide-react";

export default function InboxSummaryWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("fetchGmailInbox", {})
      .then(res => {
        const emails = res.data?.emails || [];
        const high = emails.filter(e => e.importance === "high").length;
        const senders = new Set(emails.map(e => e.from?.split("<")[0]?.trim())).size;
        setData({ total: emails.length, high, senders });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-2">Inbox verisi yüklenemedi.</p>;
  }

  return (
    <div className="flex items-center gap-6 py-1 flex-wrap">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">{data.total}</div>
        <div className="text-xs text-muted-foreground">toplam mail</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-500">{data.high}</div>
        <div className="text-xs text-muted-foreground">önemli</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-500">{data.senders}</div>
        <div className="text-xs text-muted-foreground">farklı kişiden</div>
      </div>
    </div>
  );
}