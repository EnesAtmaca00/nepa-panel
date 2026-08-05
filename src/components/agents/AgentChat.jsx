// SORUN 4: Ajanlarla bireysel/grup sohbet
import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { minimumSystemPrompt } from "@/lib/aiEngine";

const AGENT_PERSONAS = {
  researcher: {
    label: "🔍 Araştırmacı",
    persona: "Sen Araştırmacı ajanısın. CRM verilerinden bilgi toplar ve analiz edersin. Kısa, veri odaklı cevaplar ver (max 2 cümle).",
  },
  drafter: {
    label: "✍️ Taslaklayıcı",
    persona: "Sen Taslaklayıcı ajanısın. İçerik ve metin üretirsin. Yaratıcı ve marka sesine uygun cevaplar ver (max 2 cümle).",
  },
  auditor: {
    label: "🛡️ Denetçi",
    persona: "Sen Denetçi ajanısın. İçeriklerin kalitesini ve marka uyumunu kontrol edersin. Eleştirel ve yapıcı cevaplar ver (max 2 cümle).",
  },
  enricher: {
    label: "🔍 Enricher",
    persona: "Sen Zenginleştirici ajanısın. Firma bilgilerini web kaynaklarından toplar ve doldurursun (max 2 cümle).",
  },
  analyst: {
    label: "📊 Analyst",
    persona: "Sen Analist ajanısın. Sektörel verileri analiz eder ve pattern çıkarırsın. Sayısal ve analitik cevaplar ver (max 2 cümle).",
  },
};

export default function AgentChat() {
  const [selectedAgents, setSelectedAgents] = useState(["all"]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState("");
  const endRef = useRef(null);

  const { data: settings = {} } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => (await base44.entities.AppSettings.list())?.[0] || {},
    initialData: {},
    // initialData react-query tarafından TAZE veri sayılıyor;
    // staleTime ile birleşince sorgu hiç çalışmıyordu. 0 = hemen bayat.
    initialDataUpdatedAt: 0,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleAgent = (role) => {
    if (role === "all") {
      setSelectedAgents(["all"]);
    } else {
      const next = selectedAgents.includes("all")
        ? [role]
        : selectedAgents.includes(role)
        ? selectedAgents.filter(r => r !== role)
        : [...selectedAgents, role];
      setSelectedAgents(next.length === 0 ? ["all"] : next);
    }
  };

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    const question = input;
    setInput("");
    setLoading(true);

    const agents = selectedAgents.includes("all")
      ? Object.keys(AGENT_PERSONAS)
      : selectedAgents;

    try {
      for (const agent of agents) {
        setLoadingAgent(agent);
        const persona = AGENT_PERSONAS[agent];
        if (!persona) continue;

        try {
          const res = await base44.functions.invoke("aiInvoke", {
            task_type: "agent_chat",
            system_prompt: persona.persona + "\n\nNe-Pa Panel ajans yönetim sistemindesin. Kısa (max 3 cümle) ve net cevap ver.",
            prompt: question,
            json_mode: false,
            skip_cache: true,
            max_tokens: 200,
          });

          const data = res.data || res;
          if (data.error) throw new Error(data.error);

          const agentMsg = {
            role: "assistant",
            agent_role: agent,
            content: data.result || "—",
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, agentMsg]);
        } catch (e) {
          setMessages(prev => [...prev, {
            role: "assistant",
            agent_role: agent,
            content: `❌ ${e.message}`,
            timestamp: new Date().toISOString(),
          }]);
        }
      }
    } catch (e) {
      toast.error(`Ajan hatası: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingAgent("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-500" />
          🤖 Ajanlarla Sohbet
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Tek bir ajana veya tümüne aynı anda soru sor — her biri kendi rolü ile cevap verir.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Ajan seçimi */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleAgent("all")}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              selectedAgents.includes("all")
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white border-slate-200 hover:border-orange-300"
            }`}
          >
            👥 Tüm Ajanlar
          </button>
          {Object.entries(AGENT_PERSONAS).map(([role, meta]) => (
            <button
              key={role}
              onClick={() => toggleAgent(role)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                selectedAgents.includes(role) && !selectedAgents.includes("all")
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white border-slate-200 hover:border-orange-300"
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>

        {/* Mesaj alanı */}
        <div className="h-80 overflow-y-auto border rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-900/30">
          {messages.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Bir ajanla veya tüm ajanlarla sohbet başlatmak için soru yaz.
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-orange-500 text-white rounded-br-sm"
                  : "bg-white dark:bg-card border rounded-bl-sm"
              }`}>
                {msg.agent_role && (
                  <Badge variant="outline" className="mb-1 text-[10px]">
                    {AGENT_PERSONAS[msg.agent_role]?.label || msg.agent_role}
                  </Badge>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-card border rounded-2xl rounded-bl-sm px-3 py-2 text-xs flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {loadingAgent && AGENT_PERSONAS[loadingAgent]
                  ? `${AGENT_PERSONAS[loadingAgent].label} cevap yazıyor...`
                  : "Ajanlar cevap yazıyor..."}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder={selectedAgents.includes("all")
              ? "Tüm ajanlara sor..."
              : `${selectedAgents.map(r => AGENT_PERSONAS[r]?.label || r).join(", ")} ajanına sor...`}
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}