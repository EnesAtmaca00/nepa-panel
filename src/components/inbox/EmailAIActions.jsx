import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Copy, Bell, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const TONE_LABELS = { formal: "Resmi", friendly: "Samimi", brief: "Kısa" };

export function ReplyModal({ email, open, onClose }) {
  const [tone, setTone] = useState("formal");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "generate_reply",
        content: `Konu: ${email.subject}\nGönderen: ${email.from}\nİçerik: ${email.body || email.snippet}`,
        tone,
        language: "tr",
      });
      const text = res.data?.result || res.data?.text || res.data?.reply || "Cevap üretilemedi.";
      setDraft(text);

      // Cache
      await base44.entities.AICache.create({
        task_type: "generate_reply",
        input_hash: email.id + "_" + tone,
        result: text,
      }).catch(() => {});
    } catch (e) {
      toast.error("Cevap üretilemedi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" /> Cevap Taslağı Oluştur
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate">Konu: {email.subject}</p>
        <div className="flex gap-2 items-center">
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TONE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Üret
          </Button>
        </div>
        {draft && (
          <div className="relative">
            <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {draft}
            </div>
            <Button
              size="sm" variant="outline"
              className="absolute top-2 right-2"
              onClick={() => { navigator.clipboard.writeText(draft); toast.success("Kopyalandı"); }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RemindModal({ email, open, onClose }) {
  const [days, setDays] = useState("3");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const dt = new Date();
      dt.setDate(dt.getDate() + parseInt(days));
      await base44.entities.Notification.create({
        title: `Takip: ${email.subject}`,
        message: `${email.from} kişisinden gelen mail takibi`,
        severity: "info",
        send_at: dt.toISOString(),
        channels: ["in_app"],
        read: false,
      });
      toast.success(`${days} gün sonra hatırlatıcı kuruldu`);
      onClose();
    } catch (e) {
      toast.error("Hata: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4" /> Hatırlatıcı Kur
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Ne zaman hatırlatayım?</p>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 gün sonra</SelectItem>
            <SelectItem value="3">3 gün sonra</SelectItem>
            <SelectItem value="7">1 hafta sonra</SelectItem>
            <SelectItem value="14">2 hafta sonra</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Hatırlatıcı Kur"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function ChatModal({ email, open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const context = `Aşağıdaki e-postaya ilişkin sorulara yanıt ver:\n\nKonu: ${email.subject}\nGönderen: ${email.from}\nİçerik: ${email.body || email.snippet}`;
      const res = await base44.functions.invoke("aiInvoke", {
        task_type: "email_chat",
        content: userMsg,
        context,
        language: "tr",
      });
      const reply = res.data?.result || res.data?.text || res.data?.reply || "Yanıt üretilemedi.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Hata: " + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Bu Mail Hakkında Sohbet
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground truncate">Konu: {email.subject}</p>
        <div className="bg-muted rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Bu mail hakkında soru sor…</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`text-xs p-2 rounded ${m.role === "user" ? "bg-accent/10 text-right" : "bg-white border"}`}>
              {m.content}
            </div>
          ))}
          {loading && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Yanıt üretiliyor…</div>}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
            placeholder="Sorunuzu yazın..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          <Button size="sm" onClick={send} disabled={loading || !input.trim()}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryBadge({ category }) {
  const map = {
    invoice: { label: "Fatura", cls: "bg-orange-100 text-orange-700" },
    client: { label: "Müşteri", cls: "bg-blue-100 text-blue-700" },
    internal: { label: "İç İletişim", cls: "bg-green-100 text-green-700" },
    spam: { label: "Spam", cls: "bg-gray-100 text-gray-500" },
    urgent: { label: "Acil", cls: "bg-red-100 text-red-700" },
    info: { label: "Bilgi", cls: "bg-purple-100 text-purple-700" },
  };
  const c = map[category];
  if (!c) return null;
  return <Badge className={`text-xs ${c.cls} border-0`}>{c.label}</Badge>;
}

export function ActionBadge({ action }) {
  const map = {
    reply: { label: "Cevapla", cls: "bg-blue-500 text-white" },
    archive: { label: "Arşivle", cls: "bg-gray-500 text-white" },
    follow_up: { label: "Takip et", cls: "bg-amber-500 text-white" },
    pay: { label: "Ödemesini yap", cls: "bg-red-500 text-white" },
  };
  const c = map[action];
  if (!c) return null;
  return <Badge className={`text-xs ${c.cls} border-0`}>{c.label}</Badge>;
}