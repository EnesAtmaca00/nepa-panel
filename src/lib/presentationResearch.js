// Key gerektirmeyen araştırma motoru — Wikipedia, RestCountries, DuckDuckGo, Jina, Unsplash
// Tüm fetch'ler best-effort. Hata → sessiz atlama.

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    return r;
  } finally {
    clearTimeout(t);
  }
}

function sektorWikiTermi(sektor) {
  const s = (sektor || "").toLowerCase();
  if (s.includes("restoran") || s.includes("yemek") || s.includes("gıda")) return "Fast_casual_restaurant";
  if (s.includes("inşaat")) return "Construction_industry";
  if (s.includes("lojistik") || s.includes("nakliye")) return "Logistics";
  if (s.includes("emlak") || s.includes("gayrimenkul")) return "Real_estate";
  if (s.includes("yazılım") || s.includes("teknoloji")) return "Software_industry";
  if (s.includes("güzellik") || s.includes("kuaför")) return "Beauty_industry";
  if (s.includes("sağlık")) return "Healthcare_industry";
  if (s.includes("eğitim")) return "Education_industry";
  return (sektor || "").replace(/\s+/g, "_");
}

/**
 * @param {string} firma_adi
 * @param {string} sehir
 * @param {string} ulke
 * @param {string} sektor
 * @param {string[]} rakip_ipuclari — Rakip URL'leri (Jina ile okunur)
 * @param {string} braveApiKey — opsiyonel
 */
export async function researchTopic(firma_adi, sehir, ulke, sektor, rakip_ipuclari = [], braveApiKey = "") {
  const arastirma = {
    sehir_verisi: null,
    ulke_verisi: null,
    firma_bilgisi: null,
    rakip_verileri: [],
    sektor_bilgisi: null,
    gorseller: [],
    kaynaklar: [],
  };

  // 1. WIKIPEDIA — Şehir
  if (sehir) {
    try {
      const r = await fetchWithTimeout(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sehir)}`,
        { headers: { "User-Agent": "NepaPanel/1.0" } }
      );
      if (r.ok) {
        const d = await r.json();
        arastirma.sehir_verisi = {
          ozet: d.extract?.substring(0, 500) || "",
          koordinat: d.coordinates || null,
          nufus_tahmini: d.extract?.match(/population[^\d]*(\d[\d,]+)/i)?.[1] || null,
        };
        arastirma.kaynaklar.push(`Wikipedia: ${sehir}`);
      }
    } catch {}
  }

  // 2. WIKIPEDIA — Sektör
  if (sektor) {
    try {
      const term = sektorWikiTermi(sektor);
      const r = await fetchWithTimeout(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
        { headers: { "User-Agent": "NepaPanel/1.0" } }
      );
      if (r.ok) {
        const d = await r.json();
        if (d.extract) {
          arastirma.sektor_bilgisi = d.extract.substring(0, 400);
          arastirma.kaynaklar.push(`Wikipedia: ${term}`);
        }
      }
    } catch {}
  }

  // 3. RESTCOUNTRIES — Ülke
  if (ulke) {
    try {
      const r = await fetchWithTimeout(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(ulke)}?fields=name,population,currencies,languages,capital,area`
      );
      if (r.ok) {
        const d = await r.json();
        const u = d?.[0];
        if (u) {
          arastirma.ulke_verisi = {
            nufus: u.population,
            baskent: u.capital?.[0],
            para_birimi: Object.values(u.currencies || {})[0]?.name,
            diller: Object.keys(u.languages || {}),
          };
          arastirma.kaynaklar.push("RestCountries API");
        }
      }
    } catch {}
  }

  // 4. DUCKDUCKGO Instant Answer — Firma hakkında
  if (firma_adi) {
    try {
      const q = `${firma_adi} ${sehir || ""}`.trim();
      const r = await fetchWithTimeout(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1`,
        { headers: { "User-Agent": "NepaPanel/1.0" } }
      );
      if (r.ok) {
        const d = await r.json();
        if (d.AbstractText) {
          arastirma.firma_bilgisi = d.AbstractText.substring(0, 400);
          arastirma.kaynaklar.push(`DuckDuckGo: ${d.AbstractURL || "instant"}`);
        }
      }
    } catch {}
  }

  // 5. JINA READER — Rakip URL'leri oku
  for (const rakipUrl of (rakip_ipuclari || []).slice(0, 3)) {
    if (!rakipUrl || !rakipUrl.startsWith("http")) continue;
    try {
      const r = await fetchWithTimeout(`https://r.jina.ai/${rakipUrl}`, {
        headers: { Accept: "application/json", "User-Agent": "NepaPanel/1.0" },
      });
      if (r.ok) {
        const text = await r.text();
        let icerik = "";
        try {
          icerik = JSON.parse(text)?.data?.content?.substring(0, 800) || "";
        } catch {
          icerik = text.substring(0, 800);
        }
        if (icerik) {
          arastirma.rakip_verileri.push({ url: rakipUrl, icerik, kaynak: "Jina Reader" });
          arastirma.kaynaklar.push(`Jina: ${rakipUrl}`);
        }
      }
    } catch {}
  }

  // 6. BRAVE SEARCH — Key varsa
  if (braveApiKey && firma_adi) {
    try {
      const q = `${firma_adi} ${sektor || ""} ${sehir || ""} concurrent`.trim();
      const r = await fetchWithTimeout(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5`,
        { headers: { "X-Subscription-Token": braveApiKey, Accept: "application/json" } }
      );
      if (r.ok) {
        const d = await r.json();
        const sonuclar = d.web?.results?.slice(0, 3) || [];
        for (const s of sonuclar) {
          arastirma.rakip_verileri.push({
            url: s.url,
            baslik: s.title,
            ozet: s.description?.substring(0, 300),
            kaynak: "Brave Search",
          });
        }
        if (sonuclar.length > 0) arastirma.kaynaklar.push("Brave Search");
      }
    } catch {}
  }

  // 7. UNSPLASH SOURCE — Görseller (key gerektirmez)
  const anahtarlar = [
    `${sektor || ""} ${sehir || ""}`.trim(),
    `${(firma_adi || "").split(" ")[0]} business`,
    `${ulke || "city"} street`,
    `digital marketing professional`,
    `${sektor || "business"} workspace`,
  ].filter(Boolean);

  arastirma.gorseller = anahtarlar.slice(0, 6).map((anahtar, i) => ({
    url: `https://source.unsplash.com/800x500/?${encodeURIComponent(anahtar)}&sig=${Date.now()}_${i}`,
    anahtar,
    index: i,
  }));

  return arastirma;
}

/**
 * Araştırma verisini system prompt'a eklenecek metne dönüştürür.
 */
export function arastirmaOzetiMetni(arastirma) {
  if (!arastirma) return "";
  const parcalar = [];
  if (arastirma.sehir_verisi?.ozet) {
    parcalar.push(`ŞEHİR: ${arastirma.sehir_verisi.ozet}`);
  }
  if (arastirma.ulke_verisi) {
    const u = arastirma.ulke_verisi;
    parcalar.push(
      `ÜLKE: Nüfus ${u.nufus?.toLocaleString() || "?"}, Para birimi: ${u.para_birimi || "?"}, Başkent: ${u.baskent || "?"}`
    );
  }
  if (arastirma.sektor_bilgisi) {
    parcalar.push(`SEKTÖR (Wikipedia): ${arastirma.sektor_bilgisi}`);
  }
  if (arastirma.firma_bilgisi) {
    parcalar.push(`FİRMA HAKKINDA: ${arastirma.firma_bilgisi}`);
  }
  if (arastirma.rakip_verileri.length > 0) {
    const rakipler = arastirma.rakip_verileri
      .map((r) => `- ${r.baslik || r.url}: ${r.ozet || r.icerik?.substring(0, 200) || ""}`)
      .join("\n");
    parcalar.push(`RAKİP VERİSİ:\n${rakipler}`);
  }
  if (arastirma.kaynaklar.length > 0) {
    parcalar.push(`Kaynaklar: ${arastirma.kaynaklar.join(", ")}`);
  }
  return parcalar.join("\n\n");
}