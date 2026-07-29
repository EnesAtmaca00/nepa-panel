// AjansPro — Türkçe formatlama yardımcıları

export function formatCurrency(amount, currency = "TRY") {
  if (amount === null || amount === undefined || isNaN(amount)) return "-";
  const symbol = currency === "EUR" ? "€" : "₺";
  const formatted = Number(amount).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "EUR" ? `${formatted} ${symbol}` : `${formatted} ${symbol}`;
}

export function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatDateTime(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const dateStr = formatDate(date);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dateStr} ${hh}:${mi}`;
}

export const COUNTRY_FLAGS = {
  TR: "🇹🇷",
  BE: "🇧🇪",
  OTHER: "🌍",
};

export const COUNTRY_NAMES = {
  TR: "Türkiye",
  BE: "Belçika",
  OTHER: "Diğer",
};

export const SECTORS = [
  "Restoran & Cafe",
  "Moda & Tekstil",
  "Güzellik & Kozmetik",
  "Sağlık & Klinik",
  "Eğitim",
  "E-ticaret",
  "Gayrimenkul",
  "Teknoloji",
  "Otomotiv",
  "Spor & Fitness",
  "Turizm & Otel",
  "Finans",
  "Hukuk",
  "Mimarlık & Tasarım",
  "Üretim & Sanayi",
  "Tarım",
  "Etkinlik & Organizasyon",
  "Müzik & Sanat",
  "Lojistik",
  "Diğer",
];

export const PLATFORMS = [
  "instagram_post",
  "instagram_reels",
  "instagram_story",
  "tiktok",
  "linkedin",
  "x",
  "facebook",
  "youtube_shorts",
  "blog",
  "newsletter",
  "website_update",
];

export const PLATFORM_LABELS = {
  instagram_post: "Instagram Post",
  instagram_reels: "Instagram Reels",
  instagram_story: "Instagram Story",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  facebook: "Facebook",
  youtube_shorts: "YouTube Shorts",
  blog: "Blog",
  newsletter: "Newsletter",
  website_update: "Web Sitesi Güncelleme",
};

export function getStatusColor(status) {
  const map = {
    active: "bg-green-100 text-green-700 border-green-200",
    paused: "bg-amber-100 text-amber-700 border-amber-200",
    ended: "bg-slate-100 text-slate-700 border-slate-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    pending_internal: "bg-orange-100 text-orange-700 border-orange-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    sent_to_client: "bg-blue-100 text-blue-700 border-blue-200",
    client_approved: "bg-green-100 text-green-700 border-green-200",
    revision_requested: "bg-rose-100 text-rose-700 border-rose-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    paid: "bg-green-100 text-green-700 border-green-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
    partial: "bg-blue-100 text-blue-700 border-blue-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    done: "bg-green-100 text-green-700 border-green-200",
    skipped: "bg-slate-100 text-slate-500 border-slate-200",
    on_track: "bg-green-100 text-green-700 border-green-200",
    at_risk: "bg-yellow-100 text-yellow-700 border-yellow-200",
    behind: "bg-red-100 text-red-700 border-red-200",
    achieved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    exceeded: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return map[status] || "bg-slate-100 text-slate-700 border-slate-200";
}

export function getStatusLabel(status) {
  const map = {
    active: "Aktif",
    paused: "Duraklatıldı",
    ended: "Sonlandı",
    pending: "Bekliyor",
    paid: "Ödendi",
    overdue: "Gecikti",
    partial: "Kısmi",
    todo: "Yapılacak",
    in_progress: "Devam Ediyor",
    review: "İnceleniyor",
    done: "Tamamlandı",
    skipped: "Atlandı",
    on_track: "Yolunda",
    at_risk: "Riskli",
    behind: "Geride",
    achieved: "Tutturuldu",
    exceeded: "Aşıldı",
    not_started: "Başlamadı",
    ready: "Hazır",
    published: "Yayınlandı",
    none: "Onay Yok",
    manual_internal: "İç Onay",
    client_approval: "Müşteri Onayı",
    pending_internal: "İç Onay Bekliyor",
    approved: "Onaylandı",
    sent_to_client: "Müşteriye Gönderildi",
    client_approved: "Müşteri Onayladı",
    revision_requested: "Revizyon İstendi",
    rejected: "Reddedildi",
  };
  return map[status] || status;
}

export function diffDays(date1, date2 = new Date()) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = d1.getTime() - d2.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Pazartesi
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date = new Date()) {
  const start = startOfWeek(date);
  start.setDate(start.getDate() + 6);
  return start;
}

export function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  return d;
}

export function endOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  return d;
}