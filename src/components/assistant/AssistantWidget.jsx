import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { Bot, X, History, Send, AlertCircle } from "lucide-react";
import { processAssistantMessage, executePendingActions } from "@/lib/assistantCore";
import { checkSystemHealth } from "@/lib/systemHealth";
import { toast } from "sonner";

const ACCENT = "#FF6B35";

const EXAMPLES = [
  "📊 /status",
  "🔧 /fix",
  "🧪 /ai test",
  "📅 Bu hafta için içerik fikirleri üret",
];

export default function AssistantWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sistemSorunlari, setSistemSorunlari] = useState([]);
  const [sorunBildirildi, setSorunBildirildi] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isAIStudio = false; // Artık tüm sayfalarda göster

  // Sayfa açılınca sistem sağlığını kontrol et (5dk'da bir tekrar)
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const sorunlar = await checkSystemHealth();
      if (mounted) setSistemSorunlari(sorunlar);
    };
    run();
    const interval = setInterval(run, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Asistan açıldığında sorun varsa otomatik mesaj düş (sadece bir kez)
  useEffect(() => {
    if (!open || sorunBildirildi || sistemSorunlari.length === 0) return;
    setSorunBildirildi(true);
    const ozet = sistemSorunlari.map(s => `• ${s.mesaj}`).join("\n");
    const otomatikFix = sistemSorunlari.some(s => s.otomatikDuzeltilebilir);
    const autoMsg = {
      role: "assistant",
      content: `⚠️ **Sistem sorunu tespit ettim:**\n${ozet}\n\n${otomatikFix ? "`/fix` yazarak takılı projeleri sıfırlayabilirim. " : ""}Detay için `/status` yaz.`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => prev.some(m => m.content?.startsWith("⚠️ **Sistem sorunu")) ? prev : [...prev, autoMsg]);
  }, [open, sistemSorunlari, sorunBildirildi]);

  const sorunSayisi = sistemSorunlari.reduce((s, x) => s + (x.sayi || 0), 0);

  // Sayfa açılınca son web session'ı yükle (lazy — sadece açıldığında)
  // SORUN 2: Sadece company_id: null olan genel oturumlar — firma chatlerini karıştırma
  useEffect(() => {
    if (!open || sessionId) return;
    (async () => {
      try {
        const sessions = await base44.entities.AIChatSession.filter(
          { channel: "web", company_id: null }, "-last_message_at", 1
        );
        if (sessions?.[0]) {
          setSessionId(sessions[0].id);
          setMessages(sessions[0].messages || []);
        } else {
          const created = await base44.entities.AIChatSession.create({
            channel: "web",
            company_id: null,
            messages: [],
            last_message_at: new Date().toISOString(),
            message_count: 0,
            title: "Yeni Sohbet",
          });
          setSessionId(created.id);
        }
      } catch (e) {
        console.error("Session load failed", e);
      }
    })();
  }, [open, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Tüm hook'lardan SONRA erken return
  if (isAIStudio) return null;

  async function persistSession(finalMessages) {
    if (!sessionId) return;
    try {
      const trimmed = finalMessages.slice(-50);
      const firstUserMsg = finalMessages.find(m => m.role === "user");
      await base44.entities.AIChatSession.update(sessionId, {
        messages: trimmed,
        last_message_at: new Date().toISOString(),
        message_count: finalMessages.length,
        title: firstUserMsg?.content?.substring(0, 50) || "Sohbet",
      });
    } catch (e) {
      console.error("Session persist failed", e);
    }
  }

  async function handleSend(textOverride) {
    const userMsg = (textOverride ?? input).trim();
    if (!userMsg || loading) return;

    setInput("");
    setLoading(true);

    const userMessage = { role: "user", content: userMsg, timestamp: new Date().toISOString() };
    const updated = [...messages, userMessage];
    setMessages(updated);

    try {
      const companies = await base44.entities.Company.filter({ deleted: false, status: "active" }, "-updated_date", 30);
      const result = await processAssistantMessage({
        userMessage: userMsg,
        history: updated,
        companies: companies || [],
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

      if (result.executedActions?.some(a => !a.error)) {
        toast.success(`${result.executedActions.filter(a => !a.error).length} aksiyon yapıldı`);
      }
    } catch (e) {
      let hataMesaji = "Bir hata oluştu.";
      const msg = e?.message || "";
      if (msg.includes("zaman aşımı") || msg.toLowerCase().includes("timeout")) {
        hataMesaji = "AI modeli yanıt veremedi (zaman aşımı). Seçtiğiniz model çok yavaş olabilir — Ayarlar > AI Model'den daha hızlı bir model seçmeyi deneyin.";
      } else if (msg.includes("AI çağrısı başarısız")) {
        // Backend'den gelen detaylı hata — model adını içerir
        hataMesaji = msg.replace("AI çağrısı başarısız ", "").substring(0, 200);
      } else if (msg.includes("500") || msg.includes("çağrısı başarısız")) {
        hataMesaji = "AI modeli yanıt veremedi. Seçili model geçici olarak kullanılamıyor olabilir — tekrar deneyin veya Ayarlar'dan başka model seçin.";
      } else if (msg.includes("API key") || msg.includes("API anahtarı")) {
        hataMesaji = "AI API anahtarı eksik. Ayarlar > AI bölümünden ekleyin.";
      } else if (msg.includes("Unauthorized") || msg.includes("401")) {
        hataMesaji = "Yetkilendirme hatası. Sayfayı yenileyin.";
      } else {
        hataMesaji = msg.substring(0, 150) || "Bilinmeyen hata.";
      }
      const errorMsg = {
        role: "assistant",
        content: `⚠️ ${hataMesaji}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(idx, pendingActions) {
    setLoading(true);
    try {
      const results = await executePendingActions(pendingActions || []);
      const confirmMsg = {
        role: "assistant",
        content: "✅ Tamam, yapıldı!",
        timestamp: new Date().toISOString(),
        actions: results,
      };
      const updated = [...messages];
      // Onay bekleyen mesajın pending'ini temizle
      if (updated[idx]) updated[idx] = { ...updated[idx], needsConfirmation: false, pendingActions: [] };
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
    const denyMsg = {
      role: "assistant",
      content: "Tamam, iptal ettim.",
      timestamp: new Date().toISOString(),
    };
    const finalMessages = [...updated, denyMsg];
    setMessages(finalMessages);
    persistSession(finalMessages);
  }

  return (
    <>
      {/* Floating Button — DÜZELTME 6: sabit pozisyon, yüksek z-index */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: sorunSayisi > 0 ? "#dc2626" : ACCENT,
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: sorunSayisi > 0
              ? "0 4px 12px rgba(220, 38, 38, 0.4)"
              : "0 4px 12px rgba(255, 107, 53, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          title={sorunSayisi > 0 ? `${sorunSayisi} sistem sorunu` : "Ne-Pa Asistan"}
        >
          <Bot className="w-7 h-7" />
          {sorunSayisi > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "22px",
                height: "22px",
                background: "white",
                color: "#dc2626",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #dc2626",
              }}
              className="animate-pulse"
            >
              {sorunSayisi}
            </span>
          )}
        </button>
      )}

      {/* Chat Popup — DÜZELTME 6: sabit pozisyon, butonun üstünde */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            zIndex: 9998,
            width: "min(calc(100vw - 32px), 384px)",
            height: "min(calc(100vh - 120px), 600px)",
          }}
          className="bg-white dark:bg-card rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: sorunSayisi > 0 ? "#dc2626" : ACCENT }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{sorunSayisi > 0 ? "⚠️" : "🤖"}</span>
              <div>
                <p className="text-white font-semibold text-sm">Ne-Pa Asistan</p>
                <p className="text-white/80 text-xs">
                  {sorunSayisi > 0 ? `${sorunSayisi} sistem sorunu — /fix yaz` : "Her şeye yardım eder"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setOpen(false); navigate("/asistan"); }}
                className="text-white/80 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 flex items-center gap-1"
                title="Geçmiş"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Geçmiş</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mesaj listesi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-background">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">👋</p>
                <p className="text-gray-700 dark:text-gray-200 text-sm font-medium">Merhaba! Ne-Pa Asistanın.</p>
                <p className="text-gray-400 text-xs mt-1">İçerik ekle, görev oluştur, hatırlatma kur...</p>
                <div className="mt-4 space-y-2">
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleSend(ex.replace(/^[^\s]+\s/, ""))}
                      className="block w-full text-left text-xs text-gray-600 dark:text-gray-300 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-white dark:bg-card text-gray-800 dark:text-gray-100 rounded-bl-sm border"
                  }`}
                  style={msg.role === "user" ? { backgroundColor: ACCENT } : {}}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Yapılan aksiyonlar */}
                  {msg.actions?.length > 0 && (
                    <div className={`mt-2 space-y-1 border-t pt-2 ${msg.role === "user" ? "border-white/20" : "border-gray-200 dark:border-gray-700"}`}>
                      {msg.actions.map((a, j) => (
                        <div key={j} className="flex items-center gap-1.5 text-xs">
                          <span>{a.icon}</span>
                          <span className={a.error ? "line-through opacity-60" : ""}>
                            {a.type}: {a.title}
                          </span>
                          {a.error && <span className="text-red-500" title={a.error}>❌</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Onay bekleyen */}
                  {msg.needsConfirmation && msg.pendingActions?.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleConfirm(i, msg.pendingActions)}
                        className="text-xs bg-white text-orange-600 px-3 py-1 rounded-full font-medium hover:bg-orange-50 border border-orange-200"
                      >
                        ✅ Evet, yap
                      </button>
                      <button
                        onClick={() => handleDeny(i)}
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full hover:bg-gray-200"
                      >
                        İptal
                      </button>
                    </div>
                  )}

                  <p className={`text-[10px] opacity-50 mt-1 text-right`}>
                    {new Date(msg.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-card border rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white dark:bg-card">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Bir şey sor veya eklememi iste..."
                className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white dark:bg-background min-h-[40px] max-h-[120px]"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-50 transition-all hover:scale-105"
                style={{ backgroundColor: ACCENT }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-center">Enter ile gönder · Shift+Enter yeni satır</p>
          </div>
        </div>
      )}
    </>
  );
}