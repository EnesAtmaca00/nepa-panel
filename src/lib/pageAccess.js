// ============================================================
// Sayfa erişim kuralları — TEK KAYNAK
//
// Bozukluk neydi: PageAccessTab ayarları app_settings.page_role_access'e
// kaydediyordu ama RoleGuard onu HİÇ OKUMUYORDU. RoleGuard App.jsx'te
// sabit yazılmış rollere bakıyordu, Sidebar da kendi sabit listesine.
// Yani ayarlar ekranı tamamen dekoratifti — ne işaretlersen işaretle
// hiçbir şey değişmiyordu.
//
// Artık üçü de buradan besleniyor: RoleGuard, Sidebar ve PageAccessTab.
// ============================================================

export const ROLES = ["admin", "manager", "editor", "viewer"];

const AMEV = ["admin", "manager", "editor", "viewer"];
const AME = ["admin", "manager", "editor"];
const AM = ["admin", "manager"];

/** Ayarlarda bir kayıt yoksa geçerli olan varsayılanlar. */
export const DEFAULT_ACCESS = {
  "/": AMEV,
  "/anlik-planlama": AME,
  "/icerik-takvimi": AME,
  "/yayin-takvimi": AME,
  "/gorevler": AMEV,
  "/ai-studio": AME,
  "/araclar": AMEV,
  "/musteriler": AMEV,
  "/onaylar": AME,
  "/ozel-gunler": AM,
  "/tekrarlayanlar": AME,
  "/hizmetler": AM,
  "/faturalar": AM,
  "/sozlesmeler": AM,
  "/fatura-sablonlari": AM,
  "/giderler": AM,
  "/hedefler": AME,
  "/raporlar": ["admin", "manager", "viewer"],
  "/finansal-analiz": AM,
  "/ai-analiz": AM,
  "/inbox": AM,
  "/inbox-pro": AM,
  "/sosyal-medya": AM,
  "/paylasim-sirasi": AME,
  "/hashtag-kutuphanesi": AME,
  "/medya-kutuphanesi": AME,
  "/asistan": AM,
  "/web-projeleri": AME,
  "/ajanlar": AME,
  "/leads": AM,
  "/sunumlar": AM,
  "/ai-hata-gunlugu": AM,
  "/saglik": AM,
  "/ayarlar": AM,
  "/hesabim": AMEV,
  "/bildirimler": AMEV,
};

/** Ayarlar ekranında listelenen sayfalar. */
export const PAGES = [
  { path: "/", label: "Dashboard" },
  { path: "/musteriler", label: "Müşteriler" },
  { path: "/icerik-takvimi", label: "İçerik Takvimi" },
  { path: "/yayin-takvimi", label: "Yayın Takvimi" },
  { path: "/anlik-planlama", label: "Anlık Planlama" },
  { path: "/gorevler", label: "Görevler" },
  { path: "/ai-studio", label: "AI Stüdyosu" },
  { path: "/ajanlar", label: "AI Ajanları" },
  { path: "/ai-analiz", label: "AI Analiz" },
  { path: "/araclar", label: "Araç Kutusu" },
  { path: "/onaylar", label: "Onay Bekleyenler" },
  { path: "/ozel-gunler", label: "Özel Günler" },
  { path: "/tekrarlayanlar", label: "Tekrarlayanlar" },
  { path: "/faturalar", label: "Faturalar" },
  { path: "/fatura-sablonlari", label: "Fatura Şablonları" },
  { path: "/giderler", label: "Giderler" },
  { path: "/sozlesmeler", label: "Sözleşmeler" },
  { path: "/hizmetler", label: "Hizmet Kataloğu" },
  { path: "/hedefler", label: "Hedefler" },
  { path: "/raporlar", label: "Raporlar" },
  { path: "/finansal-analiz", label: "Finansal Analiz" },
  { path: "/inbox-pro", label: "AI Inbox" },
  { path: "/sosyal-medya", label: "Sosyal Medya" },
  { path: "/paylasim-sirasi", label: "Paylaşım Sırası" },
  { path: "/hashtag-kutuphanesi", label: "Hashtag Kütüphanesi" },
  { path: "/medya-kutuphanesi", label: "Medya Kütüphanesi" },
  { path: "/asistan", label: "WhatsApp & Telegram" },
  { path: "/web-projeleri", label: "Web Projeleri" },
  { path: "/sunumlar", label: "Sunumlar" },
  { path: "/leads", label: "Potansiyel Müşteriler" },
  { path: "/saglik", label: "Sağlık" },
  { path: "/ai-hata-gunlugu", label: "AI Hata Günlüğü" },
  { path: "/ayarlar", label: "Ayarlar" },
  { path: "/hesabim", label: "Hesabım" },
];

/**
 * Bir yol için izinli rolleri döndürür.
 *
 * - Alt yollar üst yolun kuralını miras alır (/musteriler/123 -> /musteriler)
 * - admin HER ZAMAN içeride: ayarlardan yanlışlıkla kendini kilitleyip
 *   panele giremez hale gelmeyi imkânsız kılıyor
 * - Hiçbir kural yoksa güvenli taraf: sadece admin+manager
 */
export function rolesForPath(pathname, access) {
  const map = { ...DEFAULT_ACCESS, ...(access || {}) };

  let allowed = map[pathname];

  if (!allowed) {
    // En uzun eşleşen üst yolu bul: /musteriler/12/duzenle -> /musteriler
    const match = Object.keys(map)
      .filter((p) => p !== "/" && pathname.startsWith(p + "/"))
      .sort((a, b) => b.length - a.length)[0];
    allowed = match ? map[match] : null;
  }

  if (!Array.isArray(allowed) || allowed.length === 0) allowed = AM;
  return allowed.includes("admin") ? allowed : ["admin", ...allowed];
}

export function canAccess(pathname, role, access) {
  return rolesForPath(pathname, access).includes(role);
}
