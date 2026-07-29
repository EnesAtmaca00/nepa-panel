// Sunum görsel teması — firmaya / sektöre özel renk paleti
// buildPresentationContext'ten gelen ctx (veya {renkler, sektor}) alır, tema objesi üretir.

const SEKTOR_TEMALAR = {
  lojistik:   { primary: "#1B264F", secondary: "#C5A059" },
  restoran:   { primary: "#C0392B", secondary: "#F39C12" },
  gida:       { primary: "#C0392B", secondary: "#F39C12" },
  teknoloji:  { primary: "#2C3E50", secondary: "#3498DB" },
  yazilim:    { primary: "#2C3E50", secondary: "#3498DB" },
  insaat:     { primary: "#E67E22", secondary: "#2C3E50" },
  emlak:      { primary: "#0F766E", secondary: "#C5A059" },
  saglik:     { primary: "#0EA5E9", secondary: "#10B981" },
  egitim:     { primary: "#7C3AED", secondary: "#F59E0B" },
  guzellik:   { primary: "#DB2777", secondary: "#FB7185" },
  spor:       { primary: "#16A34A", secondary: "#1F2937" },
  default:    { primary: "#FF6B35", secondary: "#1a1a2e" },
};

function pickSektorTema(sektor = "") {
  const s = (sektor || "").toLowerCase();
  const key = Object.keys(SEKTOR_TEMALAR).find((k) => k !== "default" && s.includes(k));
  return SEKTOR_TEMALAR[key || "default"];
}

/**
 * @param {Object} ctx — { renkler?: string[], sektor?: string }
 * @returns tema objesi
 */
export function buildSlideTheme(ctx = {}) {
  const r = Array.isArray(ctx.renkler) ? ctx.renkler.filter(Boolean) : [];
  const def = pickSektorTema(ctx.sektor);

  const primary = r[0] || def.primary;
  const secondary = r[1] || def.secondary;
  const accent = r[2] || "#ffffff";

  return {
    primary,
    secondary,
    accent,
    bg: "#ffffff",
    text: "#1a1a1a",
    textLight: "#6b7280",
    softBg: "#f8f9fa",
    gradient: `linear-gradient(135deg, ${primary}, ${secondary})`,
  };
}