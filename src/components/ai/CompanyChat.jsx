import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Loader2, MessageSquare, User, Sparkles, Plus, History, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { newWorkflowId, logAgentStep } from "@/lib/aiEngineHelpers";
import { useJobs } from "@/lib/JobsContext";
import { toast } from "sonner";
import AIProviderSelector from "./AIProviderSelector";
import AgentPipelineStatus from "./AgentPipelineStatus";

export default function CompanyChat({ companyId, companies = [] }) {
  const queryClient = useQueryClient();
  const { runJob, getJobByKey } = useJobs();
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [complex, setComplex] = useState(false);
  const [generatorProvider, setGeneratorProvider] = useState("auto");
  const [showHistory, setShowHistory] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState({});
  const endRef = useRef(null);
  const jobKey = `chat_${companyId || "genel"}`;

  const sessionsQueryKey = ["ai-chat-sessions", companyId || "general"];

  // SORUN 2: Sadece bu firmaya ait studio kanalı oturumları getir
  // companyId yoksa genel sandbox (channel=studio, company_id=null)
  const { data: sessions = [] } = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: () => base44.entities.AIChatSession.filter(
      companyId ? { company_id: companyId, channel: "studio" } : { channel: "studio", company_id: null },
      "-last_message_at",
      50
    ),
    initialData: [],
  });

  const selectedCompany = companies.find(c => c.id === companyId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SORUN 3: Firma değişince o firmaya ait SON session'ı otomatik yükle
  // Aynı firma için chat geçmişi sıfırlanmaz, devam eder.
  useEffect(() => {
    if (sessions.length > 0) {
      // Aktif session bu firmaya ait değilse veya yoksa, en son session'ı yükle
      const currentBelongs = activeSessionId && sessions.find((s) => s.id === activeSessionId);
      if (!currentBelongs) {
        const latest = sessions[0];
        setActiveSessionId(latest.id);
        setMessages(latest.messages || []);
        setComplex(latest.complex_mode || false);
      }
    } else {
      // Bu firma için hiç session yok — temizle
      setActiveSessionId(null);
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, sessions.length]);

  // Mount/firma değişince: arka planda süren chat işini geri yükle
  useEffect(() => {
    const job = getJobByKey(jobKey);
    if (job?.status === "running") {
      setLoading(true);
      setPipelineSteps({ researcher: "completed", drafter: "running" });
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobKey]);

  const loadSession = (session) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    setComplex(session.complex_mode || false);
    setShowHistory(false);
  };

  const newSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Bu sohbet silinecek, emin misin?")) return;
    await base44.entities.AIChatSession.delete(id);
    if (activeSessionId === id) newSession();
    queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
  };

  const send = () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    const sentInput = input;
    const sessionAtStart = activeSessionId;
    const historySnapshot = messages.slice(-6);
    setInput("");
    setLoading(true);

    const workflowId = newWorkflowId();
    setPipelineSteps({ researcher: "running" });

    runJob(
      async () => {
        // Researcher log
        await logAgentStep({
          workflow_id: workflowId,
          agent_role: "researcher",
          status: "completed",
          related_entity_type: "AIChatSession",
          company_id: companyId,
          output_data: { message_length: sentInput.length, complex, history_size: historySnapshot.length },
        });
        setPipelineSteps({ researcher: "completed", drafter: "running" });

        // Drafter: AI chat
        const res = await base44.functions.invoke("aiChat", {
          company_id: companyId || undefined,
          message: sentInput,
          history: historySnapshot,
          complex,
          generator_provider: generatorProvider,
        });
        if (res.data?.error) throw new Error(res.data.error);

        await logAgentStep({
          workflow_id: workflowId,
          agent_role: "drafter",
          status: "completed",
          related_entity_type: "AIChatSession",
          company_id: companyId,
          output_data: { reply_length: (res.data?.reply || "").length },
          model_used: res.data?.model || "",
        });
        setPipelineSteps({ researcher: "completed", drafter: "completed" });

        const assistantMsg = {
          role: "assistant",
          content: res.data?.reply || "—",
          timestamp: new Date().toISOString(),
        };
        const finalMessages = [...newMessages, assistantMsg];

        // Kalıcı kaydet — channel='studio' olarak işaretle, Ne-Pa Asistan'dan ayır
        const company = companies.find((c) => c.id === companyId);
        const payload = {
          company_id: companyId || undefined,
          company_name: company?.name,
          channel: "studio",
          messages: finalMessages,
          complex_mode: complex,
          last_message_at: new Date().toISOString(),
          message_count: finalMessages.length,
        };

        let savedSessionId = sessionAtStart;
        if (sessionAtStart) {
          await base44.entities.AIChatSession.update(sessionAtStart, payload);
        } else {
          payload.title = sentInput.slice(0, 60);
          const created = await base44.entities.AIChatSession.create(payload);
          savedSessionId = created.id;
        }
        return { finalMessages, savedSessionId };
      },
      {
        key: jobKey,
        title: complex ? "Stratejik yanıt üretiliyor" : "Yanıt üretiliyor",
        page: `${companies.find((c) => c.id === companyId)?.name || "Genel"} · Chat`,
        href: "/ai-studio",
      },
      (err, result) => {
        setLoading(false);
        if (err) {
          setMessages([...newMessages, { role: "assistant", content: "Hata: " + (err.message || ""), timestamp: new Date().toISOString() }]);
          setPipelineSteps({});
          toast.error("Yanıt üretilemedi");
        } else {
          setMessages(result.finalMessages);
          if (result.savedSessionId) setActiveSessionId(result.savedSessionId);
          queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
          setTimeout(() => setPipelineSteps({}), 2000);
        }
      }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[70vh]">
      {/* Geçmiş paneli */}
      <Card className={`lg:col-span-1 ${showHistory ? "block" : "hidden lg:block"} overflow-hidden flex flex-col`}>
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="w-4 h-4" /> Geçmiş ({sessions.length})
          </div>
          <Button size="sm" variant="ghost" onClick={newSession} className="h-7">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {sessions.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">Henüz sohbet yok</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => loadSession(s)}
                className={`p-3 border-b cursor-pointer hover:bg-muted/60 group ${
                  activeSessionId === s.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.title || "Başlıksız"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.message_count || 0} mesaj •{" "}
                      {s.last_message_at
                        ? format(new Date(s.last_message_at), "d MMM HH:mm", { locale: tr })
                        : "—"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Sohbet ekranı */}
      <Card className="lg:col-span-3 flex flex-col">
        <CardContent className="p-3 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)} className="lg:hidden">
              <History className="w-4 h-4" />
            </Button>
            <MessageSquare className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium truncate">
              {selectedCompany ? `🤖 ${selectedCompany.name} ile Sohbet` : "Genel Sandbox Sohbet"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AIProviderSelector value={generatorProvider} onChange={setGeneratorProvider} compact />
            <div className="flex items-center gap-1.5">
              <Label className="text-xs cursor-pointer">Karmaşık</Label>
              <Switch checked={complex} onCheckedChange={setComplex} />
            </div>
          </div>
        </CardContent>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
              "Bu marka için Mart ayı içerik takvimi oluştur" gibi sorular sor.
              <p className="text-xs mt-2 opacity-60">Tüm sohbetler kalıcı saklanır.</p>
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-slate-900" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  m.role === "user" ? "bg-gold text-slate-900 rounded-tr-sm" : "bg-muted rounded-tl-sm"
                }`}
              >
                {m.role === "user"
                  ? <div className="whitespace-pre-wrap">{m.content}</div>
                  : <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1">{m.content}</ReactMarkdown>
                }
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-slate-900 animate-spin" />
              </div>
              <div className="bg-muted p-3 rounded-2xl text-sm">Yazıyor...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {Object.keys(pipelineSteps).length > 0 && (
          <div className="px-4 py-1.5 border-t">
            <AgentPipelineStatus steps={pipelineSteps} compact />
          </div>
        )}
        <div className="p-4 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Mesajını yaz..."
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}