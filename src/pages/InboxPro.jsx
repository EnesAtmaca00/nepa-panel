import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search, Plus, RefreshCw, Sparkles, Send, Mail, MailOpen,
  AlertTriangle, User, Clock, Loader2, Star, ChevronDown,
  Bell, MessageSquare, Copy, AlertCircle
} from "lucide-react";
import { ReplyModal, RemindModal, ChatModal, CategoryBadge, ActionBadge } from "@/components/inbox/EmailAIActions";

const TONE_LABELS = { formal: "Resmi", friendly: "Samimi", brief: "Kısa" };

const importanceConfig = {
  high:   { label: "Önemli",   className: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Orta",     className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low:    { label: "Düşük",    className: "bg-slate-100 text-slate-500 border-slate-200" },
};

const TIME_FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "today", label: "Bugün cevaplanmalı" },
  { key: "week", label: "Bu hafta" },
  { key: "low_priority", label: "Acil değil" },
];

// Emailları thread'lere grupla (konu bazlı)
function groupThreads(list) {
  const map = {};
  list.forEach(e => {
    const key = e.subject?.toLowerCase().replace(/^(re:|fw:|fwd:)\s*/gi, "").trim();
    if (!map[key]) map[key] = [];
    map[key].push(e);
  });
  return Object.values(map).map(group =>
    group.length === 1 ? group[0] : { ...group[0], thread_count: group.length }
  );
}

function EmailCard({ email, onAIEnrich, onSelect, isSelected }) {
  const [expanded, setExpanded] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const cfg = importanceConfig[email.importance] || importanceConfig.medium;

  const enrich = async (e) => {
    e.stopPropagation();
    if (email.ai_summary) return;
    setEnriching(true);
    try { await onAIEnrich(email); } finally { setEnriching(false); }
  };

  return (
    <>
      <div
        className={`border-b cursor-pointer hover:bg-accent/40 transition-colors px-4 py-3 ${isSelected ? "bg-accent border-l-4 border-l-primary" : ""}`}
        onClick={() => { setExpanded(e => !e); onSelect(email); }}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0 pt-0.5">
            {email.isUnread || !email.is_read
              ? <Mail className="w-4 h-4 text-blue-500" />
              : <MailOpen className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`font-medium text-sm truncate ${email.isUnread || !email.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                {email.sender_name || email.from || email.sender_email}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                {email.date?.slice(0, 10) || new Date(email.last_activity || "").toLocaleDateString("tr-TR")}
              </span>
            </div>
            <p className={`text-xs truncate ${email.isUnread || !email.is_read ? "font-semibold" : ""}`}>
              {email.subject}
            </p>
            {email.ai_summary ? (
              <p className="text-[11px] text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 mt-0.5 flex items-center gap-1 truncate">
                <Sparkles className="w-3 h-3 shrink-0" />{email.ai_summary}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email.snippet}</p>
            )}
            <div className="flex gap-1 mt-1 flex-wrap">
              {(email.isUnread || !email.is_read) && <Badge className="text-[9px] h-4 px-1 bg-primary">Yeni</Badge>}
              {(email.is_important || email.importance === "high") && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500 text-amber-600 bg-amber-50">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Önemli
                </Badge>
              )}
              {email.ai_category && <CategoryBadge category={email.ai_category} />}
              {email.thread_count > 1 && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-indigo-50 text-indigo-600 border-indigo-200">
                  {email.thread_count} mesaj
                </Badge>
              )}
              {!email.ai_summary && (
                <button onClick={enrich} disabled={enriching}
                  className="text-[9px] text-indigo-500 hover:text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 bg-white transition-colors flex items-center gap-0.5">
                  {enriching ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                  AI Analiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detay sadece expanded iken sağ panelde değil, inline göster (mobil) */}
      <ReplyModal email={email} open={replyOpen} onClose={() => setReplyOpen(false)} />
      <RemindModal email={email} open={remindOpen} onClose={() => setRemindOpen(false)} />
      <ChatModal email={email} open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}

export default function InboxPro() {
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isNewMailOpen, setIsNewMailOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [generatedReply, setGeneratedReply] = useState("");
  const [newMailData, setNewMailData] = useState({ to: "", subject: "", instruction: "", body: "" });
  const [aiEmails, setAiEmails] = useState({}); // id → enriched data

  // EmailThread entity'den veriler — staleTime: Infinity → sayfa değişiminde yeniden fetch YOK
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["email-threads"],
    queryFn: () => base44.entities.EmailThread.list("-last_activity", 200),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 dk cache
  });

  // Gmail fetch (manuel tetikleme)
  const [gmailEmails, setGmailEmails] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState(null);
  const [gmailFetched, setGmailFetched] = useState(false);

  const fetchGmail = useCallback(async () => {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const res = await base44.functions.invoke("fetchGmailInbox", {});
      const emails = res.data?.emails || [];
      setGmailEmails(emails);
      setGmailFetched(true);
      queryClient.invalidateQueries({ queryKey: ["email-threads"] });
      toast.success(`${emails.length} mail güncellendi`);
    } catch (err) {
      setGmailError(err.message || "E-postalar yüklenemedi.");
    } finally {
      setGmailLoading(false);
    }
  }, [queryClient]);

  // Birleşik liste: Gmail ham + thread entity
  const allEmails = useMemo(() => {
    if (gmailEmails) return gmailEmails;
    if (threads.length > 0) return threads.map(t => ({
      ...t,
      id: t.id,
      subject: t.subject,
      from: t.sender_name ? `${t.sender_name} <${t.sender_email}>` : t.sender_email,
      sender_name: t.sender_name,
      sender_email: t.sender_email,
      snippet: t.snippet,
      body: t.body_html || t.body_text,
      date: t.last_activity ? new Date(t.last_activity).toLocaleDateString("tr-TR") : "",
      isUnread: !t.is_read,
      importance: t.is_important ? "high" : "medium",
    }));
    return [];
  }, [gmailEmails, threads]);

  // AI analiz devre dışı — kredi tasarrufu. Manuel olarak tetiklendiğinde basit özet göster.
  const enrichEmail = useCallback(async (email) => {
    // Kredi harcamamak için basit client-side özet
    const snippet = (email.body || email.snippet || "").substring(0, 200);
    const summary = snippet.length > 50 ? snippet.substring(0, 100) + "..." : snippet || "İçerik mevcut değil";
    setAiEmails(prev => ({
      ...prev,
      [email.id]: { ai_summary: summary, ai_category: "info", ai_draft: null },
    }));
    toast.success("Özet oluşturuldu (kredi kullanılmadı)");
  }, []);

  const mergedEmails = useMemo(() =>
    allEmails.map(e => ({ ...e, ...(aiEmails[e.id] || {}) }))
  , [allEmails, aiEmails]);

  const filteredEmails = useMemo(() => {
    let f = mergedEmails.filter(e =>
      !e.archived &&
      (e.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       e.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       e.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    if (filter === "high") f = f.filter(e => e.importance === "high" || e.is_important);
    else if (filter === "medium") f = f.filter(e => e.importance === "medium" && !e.is_important);
    else if (filter === "low") f = f.filter(e => e.importance === "low");
    if (timeFilter === "today") f = f.filter(e => e.importance === "high" || e.ai_action === "reply");
    else if (timeFilter === "week") f = f.filter(e => e.importance !== "low");
    else if (timeFilter === "low_priority") f = f.filter(e => e.importance === "low");
    return groupThreads(f);
  }, [mergedEmails, searchQuery, filter, timeFilter]);

  const isLoading = threadsLoading || gmailLoading;
  const highCount = mergedEmails.filter(e => e.importance === "high" || e.is_important).length;

  // AI Reply mutation
  const generateReplyMutation = useMutation({
    mutationFn: (instruction) => base44.functions.invoke("generateEmailReply", {
      email_thread_id: selectedEmail?.id,
      user_instruction: instruction,
    }),
    onSuccess: (res) => {
      setGeneratedReply(res.data?.reply_text || res.data?.body || "");
      toast.success("AI yanıtı üretildi");
    },
    onError: (err) => toast.error("AI hatası: " + err.message),
  });

  const generateDraftMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("generateEmailDraft", {
      recipient: data.to, subject: data.subject, user_instruction: data.instruction,
    }),
    onSuccess: (res) => {
      setNewMailData(prev => ({ ...prev, body: res.data?.email_body || res.data?.body || "" }));
      toast.success("Taslak oluşturuldu");
    },
    onError: (err) => toast.error("Taslak hatası: " + err.message),
  });

  const sendEmailMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("sendEmail", data),
    onSuccess: () => {
      setIsReplyOpen(false); setIsNewMailOpen(false);
      setGeneratedReply(""); setAiInstruction("");
      setNewMailData({ to: "", subject: "", instruction: "", body: "" });
      toast.success("E-posta gönderildi");
    },
    onError: (err) => toast.error("Gönderim hatası: " + err.message),
  });

  const selectedFull = selectedEmail
    ? (mergedEmails.find(e => e.id === selectedEmail.id) || selectedEmail)
    : null;

  return (
    <div className="flex h-[calc(100vh-56px)] bg-background overflow-hidden">
      {/* SOL: Liste */}
      <div className="w-[340px] flex-shrink-0 border-r flex flex-col">
        {/* Üst araç çubuğu */}
        <div className="p-3 border-b space-y-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold flex-1">AI Inbox</h1>
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={fetchGmail} disabled={gmailLoading} title="Gmail'den güncelle">
              <RefreshCw className={`h-3.5 w-3.5 ${gmailLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" className="h-8" onClick={() => setIsNewMailOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Yeni
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Mail ara..." className="pl-8 h-8 text-xs bg-background"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {/* Önem filtresi */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { k: "all", l: `Tümü (${mergedEmails.length})` },
              { k: "high", l: `🔴 Önemli (${highCount})` },
              { k: "medium", l: "🟡 Orta" },
              { k: "low", l: "⚪ Düşük" },
            ].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                  filter === f.k ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                }`}>
                {f.l}
              </button>
            ))}
          </div>
          {/* Zaman filtresi */}
          <div className="flex gap-1.5 flex-wrap">
            {TIME_FILTERS.map(f => (
              <button key={f.key} onClick={() => setTimeFilter(f.key)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                  timeFilter === f.key ? "bg-accent text-accent-foreground border-accent" : "bg-background text-muted-foreground border-border hover:border-accent/50"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading && !gmailFetched && threads.length === 0 ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Yükleniyor...</span>
            </div>
          ) : gmailError ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-destructive/50 mx-auto" />
              <p className="text-xs text-muted-foreground">{gmailError}</p>
              <Button variant="outline" size="sm" onClick={fetchGmail}>Tekrar Dene</Button>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MailOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {!gmailFetched && threads.length === 0
                  ? "Gmail'den yüklemek için ↑ Yenile butonuna bas"
                  : "Bu kategoride e-posta yok."}
              </p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <EmailCard
                key={email.id}
                email={email}
                onAIEnrich={enrichEmail}
                onSelect={setSelectedEmail}
                isSelected={selectedFull?.id === email.id}
              />
            ))
          )}
        </ScrollArea>
      </div>

      {/* SAĞ: Detay */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {selectedFull ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b space-y-3 bg-muted/10 flex-shrink-0">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-lg font-bold leading-tight flex-1">{selectedFull.subject}</h2>
                <Button size="sm" onClick={() => { setIsReplyOpen(true); setGeneratedReply(""); setAiInstruction(""); }}>
                  <Sparkles className="h-4 w-4 mr-1.5" /> AI Yanıt
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{selectedFull.sender_name || selectedFull.from}</div>
                  <div className="text-xs text-muted-foreground">{selectedFull.sender_email || selectedFull.from}</div>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {selectedFull.date || (selectedFull.last_activity ? new Date(selectedFull.last_activity).toLocaleString("tr-TR") : "")}
                </div>
              </div>
              {/* AI bilgileri */}
              {selectedFull.ai_summary && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-indigo-700 flex items-start gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {selectedFull.ai_summary}
                  </p>
                </div>
              )}
              {selectedFull.ai_draft && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-emerald-700 mb-1">✨ AI Taslak:</p>
                  <p className="text-xs text-emerald-800 whitespace-pre-wrap">{selectedFull.ai_draft}</p>
                </div>
              )}
            </div>

            {/* Gövde */}
            <ScrollArea className="flex-1 px-6 py-4">
              {selectedFull.body_html || selectedFull.body ? (
                <div className="prose prose-sm max-w-none dark:prose-invert text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedFull.body_html || `<pre style="white-space:pre-wrap;font-family:inherit">${selectedFull.body}</pre>` }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{selectedFull.snippet || "İçerik yok."}</p>
              )}
            </ScrollArea>

            {/* Action bar */}
            <div className="px-6 py-3 border-t flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsReplyOpen(true)}>
                <Send className="w-3.5 h-3.5" /> Yanıtla
              </Button>
              <RemindModal email={selectedFull} open={false} onClose={() => {}} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
            <Mail className="h-14 w-14 mb-3 opacity-10" />
            <p className="text-sm font-medium">Okumak için bir e-posta seçin</p>
            {!gmailFetched && threads.length === 0 && (
              <Button variant="outline" size="sm" className="mt-4 gap-1" onClick={fetchGmail} disabled={gmailLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${gmailLoading ? "animate-spin" : ""}`} />
                Gmail'den Yükle
              </Button>
            )}
          </div>
        )}
      </div>

      {/* AI YANITLA DİALOG */}
      <Dialog open={isReplyOpen} onOpenChange={setIsReplyOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI Yanıt Üret
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground truncate">Konu: {selectedFull?.subject}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Yanıt Talimatı</label>
              <Input placeholder="Örn: Kibarca reddet, Kabul et ve detay iste..."
                value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} />
            </div>
            <Button className="w-full" variant="secondary"
              onClick={() => generateReplyMutation.mutate(aiInstruction)}
              disabled={generateReplyMutation.isPending || !aiInstruction}>
              {generateReplyMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Üretiliyor...</> : "Yanıt Üret"}
            </Button>
            {generatedReply && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Yanıt (düzenleyebilirsin)</label>
                <Textarea value={generatedReply} onChange={(e) => setGeneratedReply(e.target.value)} className="min-h-[180px] text-sm" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplyOpen(false)}>İptal</Button>
            <Button disabled={!generatedReply || sendEmailMutation.isPending}
              onClick={() => sendEmailMutation.mutate({
                to: selectedFull?.sender_email || selectedFull?.from,
                subject: `Re: ${selectedFull?.subject}`,
                body: generatedReply,
                thread_id: selectedFull?.id,
              })}>
              <Send className="h-4 w-4 mr-2" />
              {sendEmailMutation.isPending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YENİ MAİL DİALOG */}
      <Dialog open={isNewMailOpen} onOpenChange={setIsNewMailOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader><DialogTitle>Yeni E-posta</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Alıcı</label>
                <Input placeholder="email@example.com" value={newMailData.to}
                  onChange={(e) => setNewMailData({ ...newMailData, to: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Konu</label>
                <Input placeholder="Konu başlığı" value={newMailData.subject}
                  onChange={(e) => setNewMailData({ ...newMailData, subject: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">AI Talimatı (opsiyonel)</label>
              <div className="flex gap-2">
                <Input placeholder="Örn: Randevu teklifi sun..." value={newMailData.instruction}
                  onChange={(e) => setNewMailData({ ...newMailData, instruction: e.target.value })} />
                <Button variant="outline" size="sm"
                  onClick={() => generateDraftMutation.mutate(newMailData)}
                  disabled={generateDraftMutation.isPending || !newMailData.instruction}>
                  {generateDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mesaj</label>
              <Textarea placeholder="Mesajınızı buraya yazın..." className="min-h-[180px] text-sm"
                value={newMailData.body} onChange={(e) => setNewMailData({ ...newMailData, body: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewMailOpen(false)}>İptal</Button>
            <Button disabled={!newMailData.to || !newMailData.body || sendEmailMutation.isPending}
              onClick={() => sendEmailMutation.mutate({ to: newMailData.to, subject: newMailData.subject, body: newMailData.body })}>
              <Send className="h-4 w-4 mr-2" />
              {sendEmailMutation.isPending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}