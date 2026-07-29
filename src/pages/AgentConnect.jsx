import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, Search, Send, Globe, Smartphone, Trash2 } from "lucide-react";
import { processAssistantMessage, executePendingActions } from "@/lib/assistantCore";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr as trLocale } from "date-fns/locale";

const ACCENT = "#FF6B35";

export default function AgentConnect() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    loadSessions();
    base44.entities.Company.filter({ deleted: false, status: "active" }, "-updated_date", 30)
      .then(setCompanies).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadSessions() {
    try {
      const list = await base44.entities.AIChatSession.list("-last_message_at", 100);
      setSessions(list || []);
      if (!activeId && list?.[0]) {
        setActiveId(list[0].id);
        setMessages(list[0].messages || []);
      }
    } catch (e) {
      console.error("Sessions load failed", e);
    }
  }

  async function handleSelectSession(s) {
    setActiveId(s.id);
    setMessages(s.messages || []);
  }

  async function handleNewSession() {
    try {
      const created = await base44.entities.AIChatSession.create({
        channel: "web",
        messages: [],
        last_message_at: new Date().toISOString(),
        message_count: 0,
        title: "Yeni Sohbet",
      });
      setSessions(prev => [created, ...prev]);
      setActiveId(created.id);
      setMessages([]);
    } catch (e) {
      toast.error("Sohbet oluşturulamadı");
    }
  }

  async function handleDelete(s) {
    if (!confirm(`"${s.title || "Sohbet"}" silinsin mi?`)) return;
    try {
      await base44.entities.AIChatSession.delete(s.id);
      setSessions(prev => prev.filter(x => x.id !== s.id));
      if (activeId === s.id) {
        setActiveId(null);
        setMessages([]);
      }
      toast.success("Sohbet silindi");
    } catch {
      toast.error("Silinemedi");
    }
  }

  async function persistSession(finalMessages) {
    if (!activeId) return;
    try {
      const trimmed = finalMessages.slice(-100);
      const firstUserMsg = finalMessages.find(m => m.role === "user");
      await base44.entities.AIChatSession.update(activeId, {
        messages: trimmed,
        last_message_at: new Date().toISOString(),
        message_count: finalMessages.length,
        title: firstUserMsg?.content?.substring(0, 60) || "Sohbet",
      });
      // Listede güncelle
      setSessions(prev => prev.map(s => s.id === activeId
        ? { ...s, messages: trimmed, last_message_at: new Date().toISOString(), title: firstUserMsg?.content?.substring(0, 60) || "Sohbet", message_count: finalMessages.length }
        : s
      ).sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)));
    } catch (e) {
      console.error("Persist failed", e);
    }
  }

  async function handleSend() {
    const userMsg = input.trim();
    if (!userMsg || loading) return;
    if (!activeId) {
      await handleNewSession();
      // newSession sonra setState yapıyor, küçük bir bekleyiş
      await new Promise(r => setTimeout(r, 100));
    }
    setInput("");
    setLoading(true);

    const userMessage = { role: "user", content: userMsg, timestamp: new Date().toISOString() };
    const updated = [...messages, userMessage];
    setMessages(updated);

    try {
      const result = await processAssistantMessage({
        userMessage: userMsg,
        history: updated,
        companies,
      });
      const assistantMessage = {
        role: "assistant",
        content: result.message,
        timestamp: new Date().toISOString(),
        actions: result.executedActions,
        needsConfirmation: result.needsConfirmation,
        confirmationText: result.confirmationText,
        pendingActions: result.pendingActions,
      };
      const finalMessages = [...updated, assistantMessage];
      setMessages(finalMessages);
      await persistSession(finalMessages);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Hata: ${e.message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(idx, pendingActions) {
    setLoading(true);
    try {
      const results = await executePendingActions(pendingActions || []);
      const updated = [...messages];
      if (updated[idx]) updated[idx] = { ...updated[idx], needsConfirmation: false, pendingActions: [] };
      const confirmMsg = {
        role: "assistant",
        content: "✅ Tamam, yapıldı!",
        timestamp: new Date().toISOString(),
        actions: results,
      };
      const finalMessages = [...updated, confirmMsg];
      setMessages(finalMessages);
      await persistSession(finalMessages);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Hata: ${e.message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }

  function handleDeny(idx) {
    const updated = [...messages];
    if (updated[idx]) updated[idx] = { ...updated[idx], needsConfirmation: false, pendingActions: [] };
    const denyMsg = { role: "assistant", content: "Tamam, iptal ettim.", timestamp: new Date().toISOString() };
    const finalMessages = [...updated, denyMsg];
    setMessages(finalMessages);
    persistSession(finalMessages);
  }

  const filteredSessions = sessions.filter(s =>
    !search || (s.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl" style={{ backgroundColor: ACCENT }}>
          🤖
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ne-Pa Asistan</h1>
          <p className="text-sm text-muted-foreground">Sohbet geçmişi ve aksiyon yönetimi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sol panel — Session listesi */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <Button onClick={handleNewSession} className="w-full gap-2" style={{ backgroundColor: ACCENT, color: "white" }}>
              <Plus className="w-4 h-4" /> Yeni Sohbet
            </Button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Sohbet ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Henüz sohbet yok
              </div>
            )}
            {filteredSessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors group ${
                  activeId === s.id
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20"
                    : "hover:bg-muted/50 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {s.channel === "telegram" ? (
                        <Smartphone className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      ) : (
                        <Globe className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      )}
                      <p className="text-xs font-medium truncate">{s.title || "Sohbet"}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {s.last_message_at ? format(new Date(s.last_message_at), "d MMM HH:mm", { locale: trLocale }) : ""}
                      {s.message_count > 0 && ` · ${s.message_count} mesaj`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Sağ panel — Sohbet */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {!activeId ? (
            <CardContent className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sohbet seçin veya yeni başlatın</p>
              </div>
            </CardContent>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    👋 Bir şey yazarak başla
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "text-white rounded-br-sm"
                          : "bg-white dark:bg-card border rounded-bl-sm"
                      }`}
                      style={msg.role === "user" ? { backgroundColor: ACCENT } : {}}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {msg.actions?.length > 0 && (
                        <div className={`mt-2 space-y-1 border-t pt-2 ${msg.role === "user" ? "border-white/20" : "border-border"}`}>
                          {msg.actions.map((a, j) => (
                            <div key={j} className="flex items-center gap-1.5 text-xs">
                              <span>{a.icon}</span>
                              <Badge variant={a.error ? "destructive" : "secondary"} className="text-[10px]">
                                {a.type}
                              </Badge>
                              <span className={a.error ? "line-through opacity-60" : ""}>{a.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.needsConfirmation && msg.pendingActions?.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => handleConfirm(i, msg.pendingActions)}>
                            ✅ Evet, yap
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDeny(i)}>
                            İptal
                          </Button>
                        </div>
                      )}

                      <p className="text-[10px] opacity-50 mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-card border rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t bg-card">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Mesajını yaz..."
                    className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-background min-h-[40px] max-h-[120px]"
                    rows={1}
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="h-10"
                    style={{ backgroundColor: ACCENT, color: "white" }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}