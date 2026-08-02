// ============================================================
// İçerik şeması — kod sahibi alanlar
//
// FELSEFE: generateImagePrompt'ta doğru olan deseni buraya taşıyoruz.
// Modelin uydurmasına izin verilen her alan, ölçtüğümüzde bozuk çıktı:
//
//   content_pillar : 71 fikrin 38'i boş, "guven" ve "güven" karışık,
//                    "sat" HİÇ üretilmemiş (0/71)
//   suggested_time : 71 fikrin 43'ü "19:00" — model düşünmüyor,
//                    varsayılan yapıştırıyor
//   negative       : 31 fikirde 29 farklı değer, üstelik hiçbir yere
//                    gönderilmiyordu
//
// Üçü de artık kodda. Model yalnızca yaratıcı içerik üretiyor.
// ============================================================

export const PILLARS = ["egit", "eglendir", "sat", "guven"];

export const PILLAR_LABELS = {
  egit: "Eğit",
  eglendir: "Eğlendir",
  sat: "Sat",
  guven: "Güven",
};

/**
 * Modelin döndürdüğü pillar'ı şemaya zorlar.
 * "Güven", "GÜVEN", "guven ", "trust" -> "guven"
 * Tanınmayan değer -> null (çağıran taraf kod önerisine düşer).
 */
export function normalizePillar(raw) {
  if (!raw) return null;
  const s = String(raw)
    .toLowerCase()
    .trim()
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");
  if (PILLARS.includes(s)) return s;
  // Modelin sık kullandığı eş anlamlılar
  const alias = {
    egitim: "egit", ogret: "egit", educate: "egit", education: "egit",
    eglence: "eglendir", entertain: "eglendir", eglen: "eglendir",
    satis: "sat", sell: "sat", conversion: "sat", donusum: "sat",
    trust: "guven", sadakat: "guven", loyalty: "guven",
  };
  return alias[s] || null;
}

/**
 * Platform + içerik türüne göre yayın saati.
 *
 * Neden kodda: modelin ürettiği saatlerin %61'i "19:00" idi — bu bir
 * öneri değil, varsayılan. Elimizde gerçek etkileşim verisi olmadığı
 * için burada da tahmin yürütüyoruz, AMA en azından platforma göre
 * değişen, tutarlı ve açıklanabilir bir tahmin.
 *
 * Şirketin kendi geçmiş yayın saatleri varsa onlar önceliklidir —
 * gerçek veri her zaman genel kabulü yener.
 */
const PLATFORM_TIMES = {
  instagram_post:  "19:00",
  instagram_reels: "20:00",
  instagram_story: "12:00",
  facebook_post:   "13:00",
  linkedin_post:   "09:00",   // iş saatleri başı
  twitter_post:    "08:00",
  tiktok_post:     "21:00",
  youtube_video:   "18:00",
  pinterest_pin:   "21:00",
};

export function suggestTime(platform, gecmisSaatler = []) {
  // Firmanın kendi geçmişi varsa en sık kullandığı saati kullan
  if (gecmisSaatler.length >= 3) {
    const sayim = {};
    for (const s of gecmisSaatler) if (s) sayim[s] = (sayim[s] || 0) + 1;
    const enSik = Object.entries(sayim).sort((a, b) => b[1] - a[1])[0];
    if (enSik && enSik[1] >= 2) return enSik[0];
  }
  return PLATFORM_TIMES[platform] || "19:00";
}

/**
 * Negatif prompt — kodda kurulur, modelden ASLA istenmez.
 * generateImagePrompt'taki listeyle aynı temel, stil bazlı eklerle.
 */
const TEMEL_NEGATIF = [
  "blurry", "low quality", "deformed", "disfigured", "extra limbs",
  "bad anatomy", "watermark", "jpeg artifacts", "oversaturated",
  "wrong scale", "floating subject", "inconsistent perspective",
];

export function buildNegativePrompt({ fotografik = true, yaziVar = false, logoVar = false } = {}) {
  const neg = [...TEMEL_NEGATIF];
  if (fotografik) neg.push("3d render", "cgi", "plastic skin", "over-smoothed", "artificial gloss");
  if (yaziVar) neg.push("gibberish text", "misspelled words", "random letters");
  else neg.push("text", "letters", "typography", "captions", "words", "writing");
  if (logoVar) neg.push("distorted logo", "unreadable brand mark");
  else neg.push("logo", "brand mark", "emblem", "trademark");
  return [...new Set(neg)].join(", ");
}

/**
 * Panoya kopyalanan negatif prompt'un başına etiket koyar.
 * Midjourney/Flux arayüzlerine yapıştırırken hangi alan olduğu belli olsun.
 */
export function negatifKopyalamaMetni(neg) {
  if (!neg) return "";
  return `Negative prompt: ${neg}`;
}

/**
 * count adet fikir için hangi pillar'ların hedefleneceğine KOD karar verir.
 *
 * Ölçüm: "sat" pillar'ı 71 fikirde 0 kez üretilmişti. Model sistem
 * prompt'unda tanımlı olmasına rağmen ticari olanı seçmiyor, sürekli
 * "guven"e kaçıyor (23/33). Artık dağılımı biz veriyoruz.
 */
export function planPillars(count, onerilen = null) {
  const sira = onerilen && PILLARS.includes(onerilen)
    ? [onerilen, ...PILLARS.filter(p => p !== onerilen)]
    : ["egit", "guven", "sat", "eglendir"];
  return Array.from({ length: count }, (_, i) => sira[i % sira.length]);
}
