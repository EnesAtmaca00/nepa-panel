// Slide tipine göre premium görsel render — tema + logo desteği
// Tipler: kapak, analiz, hizmetler, takvim, farklilasma, cta, strateji, rakip, ozel
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ANALIZ_EMOJI = ["📈", "🎯", "💡", "🔍", "✨", "🚀", "📊", "💼"];
const HIZMET_EMOJI = ["🎯", "📱", "🌐", "📊", "🎬", "🚗", "🏗️", "✉️", "💡", "🎨"];
const FARK_EMOJI = ["⭐", "🚀", "💎", "🏆", "🎯", "✨"];

function EditButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="no-print absolute top-3 right-3 text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-white/90 border hover:bg-white shadow-sm z-20"
    >
      <Pencil className="w-3 h-3" /> Düzenle
    </button>
  );
}

function InlineEditor({ slide, onSave, onCancel }) {
  const [text, setText] = useState(JSON.stringify(slide.icerik, null, 2));
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs text-muted-foreground">İçerik JSON'unu düzenle</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="w-full border rounded-md p-2 text-xs font-mono"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => {
          try { onSave({ ...slide, icerik: JSON.parse(text) }); }
          catch { alert("Geçersiz JSON"); }
        }}>
          <Save className="w-3 h-3 mr-1" /> Kaydet
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> İptal
        </Button>
      </div>
    </div>
  );
}

/** Ortak slide çerçeve (dark = kapak/cta için gradient zemin) */
function SlideShell({ children, tema, logoUrl, slideNo, totalSlides, dark = false }) {
  return (
    <div
      className="slide-card relative overflow-hidden rounded-2xl"
      style={{
        minHeight: "340px",
        background: dark ? tema.gradient : tema.bg,
        border: dark ? "none" : `1px solid ${tema.primary}22`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* Slide numarası */}
      {totalSlides > 0 && (
        <div style={{
          position: "absolute", top: "12px", right: "16px",
          fontSize: "11px", color: dark ? "rgba(255,255,255,0.5)" : tema.textLight,
          fontWeight: 500, zIndex: 5,
        }}>
          {slideNo}/{totalSlides}
        </div>
      )}
      {/* Logo — açık zeminde sol üst */}
      {logoUrl && !dark && (
        <div style={{ position: "absolute", top: "12px", left: "16px", zIndex: 5 }}>
          <img src={logoUrl} alt="Logo" style={{ height: "32px", width: "auto", objectFit: "contain", opacity: 0.9 }} />
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Kapak ───────────────────────────────────────────────
function Kapak({ icerik, tema, logoUrl }) {
  return (
    <div style={{
      padding: "56px 40px", textAlign: "center", minHeight: "340px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      {logoUrl && (
        <img src={logoUrl} alt="Logo" style={{ height: "60px", width: "auto", objectFit: "contain", marginBottom: "24px", filter: "brightness(0) invert(1)" }} />
      )}
      <p style={{ fontSize: "11px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.65)", textTransform: "uppercase", marginBottom: "14px" }}>
        {icerik.firma_adi || icerik.alt_baslik || ""}
      </p>
      <h1 style={{ fontSize: "30px", fontWeight: 800, color: "#fff", marginBottom: "10px", lineHeight: 1.2, maxWidth: "560px" }}>
        {icerik.ana_baslik || ""}
      </h1>
      {icerik.alt_baslik && (
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.88)", marginBottom: "28px", maxWidth: "440px" }}>
          {icerik.alt_baslik}
        </p>
      )}
      <div style={{ height: "1px", width: "60px", background: "rgba(255,255,255,0.4)", margin: "8px auto 16px" }} />
      {icerik.tarih && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{icerik.tarih}</p>}
    </div>
  );
}

// ─── Analiz ──────────────────────────────────────────────
function Analiz({ icerik, tema }) {
  return (
    <div style={{ padding: "48px 40px 32px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: tema.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Analiz</span>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: tema.text, marginTop: "6px", marginBottom: icerik.baslik ? "4px" : "20px" }}>
        {icerik.baslik || ""}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
        {(icerik.noktalar || []).map((n, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: "12px",
            background: `${tema.primary}0d`, borderRadius: "10px", padding: "12px 16px",
            borderLeft: `3px solid ${tema.primary}`,
          }}>
            <span style={{ fontSize: "18px", flexShrink: 0 }}>{ANALIZ_EMOJI[i % ANALIZ_EMOJI.length]}</span>
            <p style={{ fontSize: "13px", color: tema.text, lineHeight: 1.55, margin: 0 }}>{n}</p>
          </div>
        ))}
      </div>
      {icerik.vurgu && (
        <div style={{
          marginTop: "20px", background: tema.gradient, borderRadius: "12px",
          padding: "14px 20px", color: "#fff", fontSize: "14px", fontWeight: 600,
        }}>
          💬 {icerik.vurgu}
        </div>
      )}
    </div>
  );
}

// ─── Hizmetler ───────────────────────────────────────────
function Hizmetler({ icerik, tema }) {
  return (
    <div style={{ padding: "48px 40px 32px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: tema.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Hizmetler</span>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: tema.text, marginTop: "6px", marginBottom: "20px" }}>Hizmetlerimiz</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {(icerik.hizmetler || []).map((h, i) => (
          <div key={i} style={{
            background: tema.softBg, borderRadius: "14px", padding: "16px",
            borderTop: `3px solid ${tema.primary}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>
              {HIZMET_EMOJI[i % HIZMET_EMOJI.length]}
            </span>
            <p style={{ fontSize: "13px", fontWeight: 700, color: tema.text, marginBottom: "6px" }}>{h.ad}</p>
            {h.aciklama && (
              <p style={{ fontSize: "12px", color: tema.textLight, lineHeight: 1.5, margin: 0 }}>{h.aciklama}</p>
            )}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
              {h.sure && (
                <span style={{
                  fontSize: "11px", background: `${tema.primary}18`, color: tema.primary,
                  padding: "2px 8px", borderRadius: "999px", fontWeight: 500,
                }}>⏱ {h.sure}</span>
              )}
              {h.fiyat_notu && (
                <span style={{
                  fontSize: "11px", background: `${tema.secondary}22`, color: tema.secondary,
                  padding: "2px 8px", borderRadius: "999px", fontWeight: 500,
                }}>{h.fiyat_notu}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Takvim ──────────────────────────────────────────────
function Takvim({ icerik, tema }) {
  return (
    <div style={{ padding: "48px 40px 32px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: tema.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Zaman Çizelgesi</span>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: tema.text, marginTop: "6px", marginBottom: "24px" }}>Proje Takvimi</h2>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "28px", top: "20px", bottom: "20px", width: "2px", background: `${tema.primary}33`, borderRadius: "2px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(icerik.aylar || []).map((ay, i) => {
            const ayParts = (ay.ay || "").split(" ");
            return (
              <div key={i} style={{ display: "flex", gap: "20px", alignItems: "flex-start", position: "relative" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%", flexShrink: 0,
                  background: tema.gradient, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  boxShadow: `0 4px 12px ${tema.primary}50`,
                }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{ayParts[0] || ""}</span>
                  <span style={{ fontSize: "12px", color: "#fff", fontWeight: 800 }}>{ayParts[1] || ""}</span>
                </div>
                <div style={{ flex: 1, paddingTop: "8px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: tema.text, margin: 0 }}>{ay.baslik}</p>
                  <ul style={{ marginTop: "6px", paddingLeft: 0, listStyle: "none" }}>
                    {(ay.icerikler || []).map((ic2, j) => (
                      <li key={j} style={{ fontSize: "12px", color: tema.textLight, marginTop: "3px" }}>• {ic2}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Farklılaşma ─────────────────────────────────────────
function Farklilasma({ icerik, tema }) {
  const cols = Math.min(icerik.noktalar?.length || 3, 3);
  return (
    <div style={{ padding: "48px 40px 32px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: tema.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Neden Biz?</span>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: tema.text, marginTop: "6px", marginBottom: "24px" }}>Farkımız</h2>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "16px" }}>
        {(icerik.noktalar || []).map((n, i) => (
          <div key={i} style={{
            background: `${tema.primary}${["18", "12", "0a"][i % 3]}`,
            borderRadius: "16px", padding: "20px", textAlign: "center",
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: tema.gradient, margin: "0 auto 12px",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
            }}>
              {FARK_EMOJI[i % FARK_EMOJI.length]}
            </div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: tema.text, marginBottom: "6px" }}>
              {typeof n === "string" ? n : n.baslik}
            </p>
            {n.aciklama && <p style={{ fontSize: "12px", color: tema.textLight, lineHeight: 1.4, margin: 0 }}>{n.aciklama}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Strateji ────────────────────────────────────────────
function Strateji({ icerik, tema }) {
  return (
    <div style={{ padding: "48px 40px 32px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: tema.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Strateji</span>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: tema.text, marginTop: "6px", marginBottom: "8px" }}>
        {icerik.baslik || "Strateji"}
      </h2>
      {icerik.ana_baslik && <p style={{ fontSize: "14px", color: tema.textLight, marginBottom: "20px" }}>{icerik.ana_baslik}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {(icerik.noktalar || []).map((n, i) => (
          <div key={i} style={{
            display: "flex", gap: "14px", alignItems: "flex-start",
            padding: "12px 16px", background: tema.softBg, borderRadius: "12px",
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%", background: tema.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>{i + 1}</div>
            <p style={{ fontSize: "13px", color: tema.text, lineHeight: 1.55, paddingTop: "4px", margin: 0 }}>{n}</p>
          </div>
        ))}
      </div>
      {icerik.vurgu && (
        <div style={{ marginTop: "16px", background: tema.gradient, borderRadius: "12px", padding: "14px 20px", color: "#fff", fontSize: "13px", fontWeight: 600 }}>
          💡 {icerik.vurgu}
        </div>
      )}
    </div>
  );
}

// ─── Rakip ───────────────────────────────────────────────
function Rakip({ icerik, tema }) {
  return (
    <div style={{ padding: "48px 40px 32px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.1em" }}>Rekabet Analizi</span>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: tema.text, marginTop: "6px", marginBottom: "20px" }}>
        {icerik.baslik || "Rakipler"}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ background: "#FEF2F2", borderRadius: "14px", padding: "20px", borderTop: "3px solid #EF4444" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ✗ Rakiplerin Zayıfları
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(icerik.zayiflar || icerik.noktalar || []).slice(0, 5).map((n, i) => (
              <li key={i} style={{ fontSize: "12px", color: "#991B1B", marginBottom: "6px", display: "flex", gap: "6px" }}>
                <span style={{ flexShrink: 0, color: "#EF4444" }}>—</span><span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ background: "#F0FDF4", borderRadius: "14px", padding: "20px", borderTop: `3px solid ${tema.primary}` }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#15803D", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ✓ Bizim Fırsatımız
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(icerik.firsatlar || icerik.adimlar || []).slice(0, 5).map((n, i) => (
              <li key={i} style={{ fontSize: "12px", color: "#166534", marginBottom: "6px", display: "flex", gap: "6px" }}>
                <span style={{ flexShrink: 0, color: "#16A34A" }}>+</span><span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {icerik.vurgu && (
        <div style={{
          marginTop: "16px", textAlign: "center",
          background: `${tema.primary}15`, borderRadius: "10px", padding: "12px",
          fontSize: "13px", fontWeight: 600, color: tema.primary,
        }}>
          {icerik.vurgu}
        </div>
      )}
    </div>
  );
}

// ─── CTA ─────────────────────────────────────────────────
function CTA({ icerik, tema, logoUrl }) {
  return (
    <div style={{
      padding: "56px 40px", textAlign: "center", minHeight: "320px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ fontSize: "40px", marginBottom: "16px" }}>🚀</div>
      <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
        {icerik.baslik || "Başlayalım"}
      </h2>
      {icerik.aciklama && (
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", marginBottom: "24px", maxWidth: "380px" }}>
          {icerik.aciklama}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
        {(icerik.adimlar || []).map((a, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.18)", borderRadius: "8px",
            padding: "8px 22px", fontSize: "13px", color: "#fff",
            backdropFilter: "blur(4px)",
          }}>
            {i + 1}. {a}
          </div>
        ))}
      </div>
      {icerik.iletisim && (
        <div style={{
          background: "rgba(255,255,255,0.22)", borderRadius: "10px",
          padding: "12px 24px", fontSize: "13px", color: "#fff", fontWeight: 500,
        }}>
          📞 {icerik.iletisim}
        </div>
      )}
      {logoUrl && (
        <img src={logoUrl} alt="Logo" style={{
          height: "30px", width: "auto", objectFit: "contain",
          marginTop: "22px", filter: "brightness(0) invert(1)", opacity: 0.75,
        }} />
      )}
    </div>
  );
}

// ─── Özel / Bilinmeyen ───────────────────────────────────
function Ozel({ icerik, tema }) {
  const bilinen = new Set(["ana_baslik", "alt_baslik", "noktalar", "vurgu", "baslik"]);
  return (
    <div style={{ padding: "48px 40px 32px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: tema.primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Detay</span>
      <h2 style={{ fontSize: "22px", fontWeight: 700, color: tema.text, marginTop: "6px", marginBottom: "12px" }}>
        {icerik.baslik || icerik.ana_baslik || "Detay"}
      </h2>
      {icerik.ana_baslik && icerik.baslik && (
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: tema.primary, marginBottom: "10px" }}>{icerik.ana_baslik}</h3>
      )}
      {icerik.alt_baslik && <p style={{ fontSize: "13px", color: tema.textLight, marginBottom: "16px" }}>{icerik.alt_baslik}</p>}
      {icerik.noktalar?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {icerik.noktalar.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: tema.text }}>
              <span style={{ color: tema.primary, flexShrink: 0, fontWeight: 700 }}>→</span><span>{n}</span>
            </div>
          ))}
        </div>
      )}
      {icerik.vurgu && (
        <div style={{
          marginTop: "16px", background: `${tema.primary}12`,
          borderLeft: `4px solid ${tema.primary}`, borderRadius: "0 10px 10px 0",
          padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: tema.primary,
        }}>
          {icerik.vurgu}
        </div>
      )}
      {/* Diğer alanlar */}
      {Object.entries(icerik).filter(([k]) => !bilinen.has(k)).map(([k, v]) => {
        if (!v) return null;
        if (typeof v === "string") {
          return (
            <div key={k} style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: tema.textLight, textTransform: "uppercase", marginBottom: "4px" }}>
                {k.replace(/_/g, " ")}
              </p>
              <p style={{ fontSize: "13px", color: tema.text, margin: 0 }}>{v}</p>
            </div>
          );
        }
        if (Array.isArray(v)) {
          return (
            <div key={k} style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: tema.textLight, textTransform: "uppercase", marginBottom: "4px" }}>
                {k.replace(/_/g, " ")}
              </p>
              {v.map((item, i) => (
                <p key={i} style={{ fontSize: "12px", color: tema.text, margin: "2px 0" }}>
                  • {typeof item === "string" ? item : (item?.ad || item?.baslik || JSON.stringify(item))}
                </p>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

const DEFAULT_TEMA = {
  primary: "#FF6B35", secondary: "#1a1a2e", accent: "#ffffff",
  bg: "#ffffff", text: "#1a1a1a", textLight: "#6b7280", softBg: "#f8f9fa",
  gradient: "linear-gradient(135deg, #FF6B35, #ff8c5a)",
};

export default function SlideRenderer({ slide, onUpdate, tema, logoUrl, totalSlides = 0 }) {
  const [editing, setEditing] = useState(false);
  const tip = slide.tip || "analiz";
  const ic = slide.icerik || {};
  const t = tema || DEFAULT_TEMA;

  const renderers = {
    kapak: Kapak,
    analiz: Analiz,
    hizmetler: Hizmetler,
    takvim: Takvim,
    farklilasma: Farklilasma,
    cta: CTA,
    strateji: Strateji,
    rakip: Rakip,
    ozel: Ozel,
  };
  const Comp = renderers[tip] || Ozel;
  const dark = tip === "kapak" || tip === "cta";

  return (
    <Card className="slide-card relative overflow-hidden mb-4 p-0 border-0 bg-transparent shadow-none">
      <SlideShell tema={t} logoUrl={logoUrl} slideNo={slide.no} totalSlides={totalSlides} dark={dark}>
        <div className="absolute top-3 left-3 z-10 text-[10px] font-mono bg-black/40 text-white px-2 py-0.5 rounded no-print">
          {tip}
        </div>
        {!editing && <EditButton onClick={() => setEditing(true)} />}
        {editing ? (
          <InlineEditor
            slide={slide}
            onSave={(s) => { onUpdate?.(s); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Comp icerik={ic} tema={t} logoUrl={logoUrl} />
        )}
      </SlideShell>
    </Card>
  );
}