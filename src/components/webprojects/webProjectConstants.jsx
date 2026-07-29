export const FEATURE_OPTIONS = [
  { id: "e-ticaret", label: "E-Ticaret", icon: "🛒" },
  { id: "kurumsal_tanitim", label: "Kurumsal Tanıtım", icon: "🏢" },
  { id: "blog", label: "Blog", icon: "📝" },
  { id: "randevu_sistemi", label: "Randevu Sistemi", icon: "📅" },
  { id: "galeri", label: "Galeri", icon: "🖼️" },
  { id: "iletisim_formu", label: "İletişim Formu", icon: "✉️" },
  { id: "canli_destek", label: "Canlı Destek", icon: "💬" },
  { id: "cok_dil", label: "Çok Dil Desteği", icon: "🌐" },
  { id: "uyelik_sistemi", label: "Üyelik Sistemi", icon: "👤" },
  { id: "odeme_entegrasyonu", label: "Ödeme Entegrasyonu", icon: "💳" },
];

export const ANIMATION_OPTIONS = [
  { id: "scroll_reveal", label: "Scroll Reveal", icon: "📜", desc: "Sayfa kaydıkça elemanlar beliriyor" },
  { id: "parallax", label: "Parallax", icon: "🏔️", desc: "Katmanlı derinlik efekti" },
  { id: "mouse_track", label: "Mouse Tracking", icon: "🖱️", desc: "Fare hareketine tepki veren efektler" },
  { id: "3d_elements", label: "3D Elemanlar", icon: "🧊", desc: "3D objeler, dönen kartlar, derinlik" },
  { id: "micro_interactions", label: "Micro Interactions", icon: "✨", desc: "Buton hover, form geri bildirim" },
  { id: "page_transitions", label: "Sayfa Geçişleri", icon: "🔄", desc: "Sayfalar arası akıcı geçiş" },
  { id: "text_animations", label: "Metin Animasyonları", icon: "🔤", desc: "Typewriter, split, gradient text" },
  { id: "loading_animations", label: "Yükleme Animasyonları", icon: "⏳", desc: "Preloader, skeleton, shimmer" },
];

export const ANIMATION_INTENSITY_OPTIONS = [
  { id: "subtle", label: "Hafif & Zarif", icon: "🍃", desc: "İnce, dikkat dağıtmayan, profesyonel" },
  { id: "balanced", label: "Dengeli", icon: "⚖️", desc: "Fark edilir ama abartısız" },
  { id: "intense", label: "Yoğun & Gösterişli", icon: "🔥", desc: "Vurucu, deneyimsel, wow efektli" },
];

export const DESIGN_STYLES = [
  { id: "minimal", label: "Minimal", icon: "◻️", desc: "Temiz, sade, beyaz alan ağırlıklı" },
  { id: "modern", label: "Modern", icon: "🔷", desc: "Güncel trendler, dengeli tipografi" },
  { id: "bold", label: "Bold / Cesur", icon: "💥", desc: "Büyük fontlar, kontrast renkler" },
  { id: "elegant", label: "Elegant", icon: "✦", desc: "Sofistike, serif fontlar, lüks his" },
  { id: "playful", label: "Eğlenceli", icon: "🎨", desc: "Canlı renkler, yuvarlak şekiller" },
  { id: "brutalist", label: "Brutalist", icon: "🏗️", desc: "Ham, deneysel, kural dışı" },
  { id: "glassmorphism", label: "Glassmorphism", icon: "🪟", desc: "Buzlu cam, şeffaflık, blur" },
  { id: "neomorphism", label: "Neomorphism", icon: "🫧", desc: "Yumuşak gölgeler, kabartma efekt" },
  { id: "retro", label: "Retro", icon: "📻", desc: "Nostaljik, vintage renkler ve fontlar" },
  { id: "corporate", label: "Kurumsal", icon: "🏛️", desc: "Güven veren, profesyonel, ciddi" },
];

export const COLOR_MOODS = [
  { id: "light_airy", label: "Açık & Ferah", desc: "Beyaz/açık arka plan, pastel vurgular" },
  { id: "dark_premium", label: "Koyu & Premium", desc: "Koyu arka plan, altın/parlak vurgular" },
  { id: "vibrant_colorful", label: "Canlı & Renkli", desc: "Parlak gradient, neon renkler" },
  { id: "muted_pastel", label: "Soft Pastel", desc: "Yumuşak tonlar, düşük kontrast" },
  { id: "monochrome", label: "Monokrom", desc: "Tek renk ailesi, minimalist" },
  { id: "brand_colors", label: "Marka Renkleri", desc: "Firmanın kendi renk paletini kullan" },
];

export const AI_TOOLS = [
  { id: "base44", label: "Base44", description: "Full-stack AI app builder" },
  { id: "kimya", label: "Kimya", description: "AI web tasarım aracı" },
  { id: "google_antigravity", label: "Google Antigravity", description: "Google'ın AI geliştirme platformu" },
  { id: "cursor", label: "Cursor", description: "AI kod editörü" },
  { id: "bolt", label: "Bolt.new", description: "StackBlitz AI web builder" },
  { id: "lovable", label: "Lovable", description: "AI uygulama oluşturucu" },
  { id: "other", label: "Diğer", description: "Diğer bir araç" },
];

export const DELIVERY_STATUSES = [
  "Planlanıyor",
  "Analiz Aşamasında",
  "Mimari Hazırlandı",
  "Yapım Aşamasında",
  "Müşteri İncelemesinde",
  "Teslim Edildi",
  "Revizyon İstendi",
];

export const DELIVERY_STATUS_COLORS = {
  "Planlanıyor": "bg-slate-100 text-slate-700 border-slate-200",
  "Analiz Aşamasında": "bg-blue-100 text-blue-700 border-blue-200",
  "Mimari Hazırlandı": "bg-purple-100 text-purple-700 border-purple-200",
  "Yapım Aşamasında": "bg-orange-100 text-orange-700 border-orange-200",
  "Müşteri İncelemesinde": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Teslim Edildi": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Revizyon İstendi": "bg-rose-100 text-rose-700 border-rose-200",
};

export const BRAND_ORANGE = "#FF6B35";
export const BRAND_GREEN = "#15B062";