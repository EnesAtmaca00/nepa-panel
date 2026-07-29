// PPTX üretimi — pptxgenjs CDN'den dinamik yüklenir, kurulum gerektirmez.

let pptxLibPromise = null;

async function loadPptxGen() {
  if (window.PptxGenJS) return window.PptxGenJS;
  if (pptxLibPromise) return pptxLibPromise;
  pptxLibPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js";
    script.onload = () => resolve(window.PptxGenJS);
    script.onerror = () => reject(new Error("pptxgenjs yüklenemedi"));
    document.head.appendChild(script);
  });
  return pptxLibPromise;
}

/**
 * @param {Object} sunumData — { sunum_basligi, slides, kisa_ozet }
 * @param {Object} tema — { primary, secondary }
 * @param {string} logoUrl
 * @param {string} firmaAdi
 * @param {string} versiyon — "musteri" | "ic_notlar"
 */
export async function pptxUret(sunumData, tema, logoUrl, firmaAdi, versiyon = "musteri") {
  const PptxGenJS = await loadPptxGen();
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Ne-Pa Yazılım & Grafik";
  pptx.company = "Ne-Pa";
  pptx.title = sunumData.sunum_basligi || firmaAdi;

  const PRIMARY = (tema?.primary || "#FF6B35").replace("#", "");
  const SECONDARY = (tema?.secondary || "#1a1a2e").replace("#", "");
  const WHITE = "FFFFFF";
  const DARK = "1A1A1A";
  const LIGHT_BG = "F8F9FA";

  const slides = sunumData.slides || [];
  const totalSlides = slides.length;

  for (const slide of slides) {
    const pSlide = pptx.addSlide();
    const ic = slide.icerik || {};
    const isDark = ["kapak", "cta"].includes(slide.tip);

    // Arkaplan
    if (isDark) {
      pSlide.background = { color: PRIMARY };
    } else {
      pSlide.background = { color: WHITE };
      pSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.08, h: 7.5,
        fill: { color: PRIMARY }, line: { type: "none" },
      });
    }

    // Slide numarası
    pSlide.addText(`${slide.no || ""}/${totalSlides}`, {
      x: 11.5, y: 0.1, w: 1.5, h: 0.3,
      fontSize: 9, color: isDark ? "FFFFFF" : "AAAAAA",
      align: "right",
    });

    // Logo (sadece geçerli http URL'leri ekle)
    if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("http") && !logoUrl.startsWith("data:")) {
      try {
        pSlide.addImage({
          path: logoUrl,
          x: isDark ? 5.5 : 0.3,
          y: isDark ? 0.3 : 0.15,
          w: 1.5, h: 0.5,
          sizing: { type: "contain", w: 1.5, h: 0.5 },
        });
      } catch {}
    }

    switch (slide.tip) {
      case "kapak":
        pSlide.addText(ic.ana_baslik || firmaAdi, {
          x: 1, y: 2.5, w: 11, h: 1.2,
          fontSize: 40, bold: true, color: WHITE, align: "center",
        });
        pSlide.addText(ic.alt_baslik || "", {
          x: 1, y: 3.8, w: 11, h: 0.6,
          fontSize: 20, color: "FFFFFF", align: "center",
        });
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 5.8, y: 4.55, w: 1.4, h: 0.04,
          fill: { color: WHITE }, line: { type: "none" },
        });
        pSlide.addText(ic.tarih || new Date().toLocaleDateString("tr-TR"), {
          x: 1, y: 4.75, w: 11, h: 0.4,
          fontSize: 12, color: "FFFFFF", align: "center",
        });
        break;

      case "analiz":
      case "strateji": {
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 0, w: 12.2, h: 1.2,
          fill: { color: LIGHT_BG }, line: { type: "none" },
        });
        pSlide.addText(slide.baslik || "", {
          x: 0.4, y: 0.15, w: 11.5, h: 0.5,
          fontSize: 22, bold: true, color: DARK,
        });
        if (ic.baslik || ic.ana_baslik) {
          pSlide.addText(ic.baslik || ic.ana_baslik, {
            x: 0.4, y: 0.68, w: 11.5, h: 0.35,
            fontSize: 13, color: "555555",
          });
        }
        const noktalar = ic.noktalar || [];
        noktalar.slice(0, 6).forEach((n, i) => {
          const y = 1.35 + i * 0.72;
          pSlide.addShape(pptx.ShapeType.rect, {
            x: 0.3, y, w: 12.1, h: 0.62,
            fill: { color: i % 2 === 0 ? LIGHT_BG : WHITE },
            line: { color: PRIMARY, pt: 0.5 },
            rectRadius: 0.08,
          });
          pSlide.addShape(pptx.ShapeType.rect, {
            x: 0.3, y, w: 0.08, h: 0.62,
            fill: { color: PRIMARY }, line: { type: "none" },
          });
          pSlide.addText(`${i + 1}`, {
            x: 0.45, y: y + 0.15, w: 0.3, h: 0.3,
            fontSize: 11, bold: true, color: PRIMARY, align: "center",
          });
          pSlide.addText(String(n), {
            x: 0.85, y: y + 0.08, w: 11.3, h: 0.45,
            fontSize: 13, color: DARK, valign: "middle",
          });
        });
        if (ic.vurgu) {
          const vurguY = Math.min(1.35 + noktalar.length * 0.72 + 0.15, 5.6);
          pSlide.addShape(pptx.ShapeType.rect, {
            x: 0.3, y: vurguY, w: 12.1, h: 0.55,
            fill: { color: PRIMARY }, line: { type: "none" }, rectRadius: 0.1,
          });
          pSlide.addText(`💡 ${ic.vurgu}`, {
            x: 0.5, y: vurguY + 0.08, w: 11.7, h: 0.38,
            fontSize: 13, bold: true, color: WHITE,
          });
        }
        break;
      }

      case "hizmetler": {
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 0, w: 12.2, h: 0.95,
          fill: { color: LIGHT_BG }, line: { type: "none" },
        });
        pSlide.addText(slide.baslik || "Hizmetler", {
          x: 0.4, y: 0.18, w: 11.5, h: 0.55,
          fontSize: 22, bold: true, color: DARK,
        });
        const hizmetler = (ic.hizmetler || []).slice(0, 6);
        const cols = Math.min(hizmetler.length, 3) || 1;
        const cardW = 12.1 / cols - 0.15;
        const ikonlar = ["🎯", "📱", "🌐", "📊", "🎬", "🚗"];
        hizmetler.forEach((h, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = 0.3 + col * (cardW + 0.15);
          const y = 1.1 + row * 2.6;
          pSlide.addShape(pptx.ShapeType.rect, {
            x, y, w: cardW, h: 2.4,
            fill: { color: WHITE },
            line: { color: PRIMARY, pt: 0.75 },
            rectRadius: 0.12,
          });
          pSlide.addShape(pptx.ShapeType.rect, {
            x, y, w: cardW, h: 0.12,
            fill: { color: PRIMARY }, line: { type: "none" },
          });
          pSlide.addText(ikonlar[i % ikonlar.length], {
            x: x + 0.15, y: y + 0.25, w: 0.5, h: 0.5, fontSize: 20,
          });
          pSlide.addText(h.ad || "", {
            x: x + 0.12, y: y + 0.75, w: cardW - 0.24, h: 0.5,
            fontSize: 13, bold: true, color: DARK, wrap: true,
          });
          pSlide.addText(h.aciklama || "", {
            x: x + 0.12, y: y + 1.25, w: cardW - 0.24, h: 0.85,
            fontSize: 11, color: "666666", wrap: true, valign: "top",
          });
          if (h.sure) {
            pSlide.addText(`⏱ ${h.sure}`, {
              x: x + 0.12, y: y + 2.1, w: cardW - 0.24, h: 0.25,
              fontSize: 10, color: PRIMARY, bold: true,
            });
          }
        });
        break;
      }

      case "takvim": {
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 0, w: 12.2, h: 0.95,
          fill: { color: LIGHT_BG }, line: { type: "none" },
        });
        pSlide.addText(slide.baslik || "Takvim", {
          x: 0.4, y: 0.18, w: 11.5, h: 0.55,
          fontSize: 22, bold: true, color: DARK,
        });
        const aylar = (ic.aylar || []).slice(0, 6);
        const colW = 12.1 / Math.max(aylar.length, 1);
        aylar.forEach((ay, i) => {
          const x = 0.3 + i * colW;
          pSlide.addShape(pptx.ShapeType.ellipse, {
            x: x + colW / 2 - 0.4, y: 1.1, w: 0.8, h: 0.8,
            fill: { color: PRIMARY }, line: { type: "none" },
          });
          pSlide.addText(`${i + 1}`, {
            x: x + colW / 2 - 0.4, y: 1.15, w: 0.8, h: 0.7,
            fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle",
          });
          if (i < aylar.length - 1) {
            pSlide.addShape(pptx.ShapeType.rect, {
              x: x + colW / 2 + 0.4, y: 1.45, w: colW - 0.8, h: 0.04,
              fill: { color: PRIMARY }, line: { type: "none" },
            });
          }
          pSlide.addText(ay.ay || `Ay ${i + 1}`, {
            x: x + 0.1, y: 2.05, w: colW - 0.2, h: 0.35,
            fontSize: 12, bold: true, color: PRIMARY, align: "center",
          });
          pSlide.addText(ay.baslik || "", {
            x: x + 0.1, y: 2.42, w: colW - 0.2, h: 0.7,
            fontSize: 12, bold: true, color: DARK, align: "center", wrap: true,
          });
          (ay.icerikler || []).slice(0, 4).forEach((ic2, j) => {
            pSlide.addText(`• ${ic2}`, {
              x: x + 0.15, y: 3.15 + j * 0.4, w: colW - 0.3, h: 0.35,
              fontSize: 10, color: "555555", align: "center", wrap: true,
            });
          });
        });
        break;
      }

      case "rakip": {
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 0, w: 12.2, h: 0.95,
          fill: { color: LIGHT_BG }, line: { type: "none" },
        });
        pSlide.addText(slide.baslik || "Rakipler", {
          x: 0.4, y: 0.18, w: 11.5, h: 0.55,
          fontSize: 22, bold: true, color: DARK,
        });
        // Sol — Zayıflar
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 1.1, w: 5.9, h: 5.2,
          fill: { color: "FEF2F2" }, line: { color: "FCA5A5", pt: 1 }, rectRadius: 0.12,
        });
        pSlide.addText("✗  Rakiplerin Zayıfları", {
          x: 0.5, y: 1.25, w: 5.5, h: 0.4,
          fontSize: 12, bold: true, color: "DC2626",
        });
        (ic.zayiflar || ic.noktalar || []).slice(0, 6).forEach((n, i) => {
          pSlide.addText(`—  ${n}`, {
            x: 0.5, y: 1.75 + i * 0.65, w: 5.5, h: 0.55,
            fontSize: 12, color: "991B1B", wrap: true,
          });
        });
        // Sağ — Fırsatlar
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 6.4, y: 1.1, w: 5.9, h: 5.2,
          fill: { color: "F0FDF4" }, line: { color: "86EFAC", pt: 1 }, rectRadius: 0.12,
        });
        pSlide.addText("✓  Bizim Fırsatımız", {
          x: 6.6, y: 1.25, w: 5.5, h: 0.4,
          fontSize: 12, bold: true, color: "15803D",
        });
        (ic.firsatlar || ic.adimlar || []).slice(0, 6).forEach((n, i) => {
          pSlide.addText(`+  ${n}`, {
            x: 6.6, y: 1.75 + i * 0.65, w: 5.5, h: 0.55,
            fontSize: 12, color: "166534", wrap: true,
          });
        });
        if (ic.vurgu) {
          pSlide.addShape(pptx.ShapeType.rect, {
            x: 0.3, y: 6.45, w: 12.0, h: 0.45,
            fill: { color: PRIMARY }, line: { type: "none" }, rectRadius: 0.08,
          });
          pSlide.addText(ic.vurgu, {
            x: 0.5, y: 6.5, w: 11.6, h: 0.35,
            fontSize: 12, bold: true, color: WHITE, align: "center",
          });
        }
        break;
      }

      case "farklilasma": {
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 0, w: 12.2, h: 0.95,
          fill: { color: LIGHT_BG }, line: { type: "none" },
        });
        pSlide.addText(slide.baslik || "Farkımız", {
          x: 0.4, y: 0.18, w: 11.5, h: 0.55,
          fontSize: 22, bold: true, color: DARK,
        });
        const noktalarF = (ic.noktalar || []).slice(0, 3);
        const colsF = Math.max(noktalarF.length, 1);
        const cardWF = 12.1 / colsF - 0.15;
        const ikonF = ["⭐", "🚀", "💎"];
        noktalarF.forEach((n, i) => {
          const x = 0.3 + i * (cardWF + 0.15);
          pSlide.addShape(pptx.ShapeType.rect, {
            x, y: 1.1, w: cardWF, h: 5.2,
            fill: { color: PRIMARY }, line: { type: "none" }, rectRadius: 0.15,
          });
          pSlide.addShape(pptx.ShapeType.ellipse, {
            x: x + cardWF / 2 - 0.45, y: 1.5, w: 0.9, h: 0.9,
            fill: { color: WHITE }, line: { type: "none" },
          });
          pSlide.addText(ikonF[i], {
            x: x + cardWF / 2 - 0.45, y: 1.55, w: 0.9, h: 0.8,
            fontSize: 22, align: "center", valign: "middle",
          });
          pSlide.addText(typeof n === "string" ? n : (n.baslik || ""), {
            x: x + 0.2, y: 2.6, w: cardWF - 0.4, h: 0.7,
            fontSize: 14, bold: true, color: WHITE, align: "center", wrap: true,
          });
          if (n?.aciklama) {
            pSlide.addText(n.aciklama, {
              x: x + 0.2, y: 3.3, w: cardWF - 0.4, h: 2.7,
              fontSize: 12, color: WHITE, align: "center", wrap: true, valign: "top",
            });
          }
        });
        break;
      }

      case "cta":
        pSlide.addText(ic.baslik || slide.baslik || "Başlayalım", {
          x: 1, y: 1.5, w: 11, h: 1.0,
          fontSize: 32, bold: true, color: WHITE, align: "center",
        });
        if (ic.aciklama) {
          pSlide.addText(ic.aciklama, {
            x: 1, y: 2.6, w: 11, h: 0.5,
            fontSize: 14, color: WHITE, align: "center",
          });
        }
        (ic.adimlar || []).slice(0, 5).forEach((a, i) => {
          pSlide.addShape(pptx.ShapeType.rect, {
            x: 3.5, y: 3.3 + i * 0.65, w: 6, h: 0.55,
            fill: { color: WHITE }, line: { type: "none" }, rectRadius: 0.1,
          });
          pSlide.addText(`${i + 1}.  ${a}`, {
            x: 3.7, y: 3.37 + i * 0.65, w: 5.6, h: 0.4,
            fontSize: 13, color: PRIMARY, bold: true,
          });
        });
        if (ic.iletisim) {
          pSlide.addText(`📞 ${ic.iletisim}`, {
            x: 1, y: 6.4, w: 11, h: 0.4,
            fontSize: 14, color: WHITE, align: "center", bold: true,
          });
        }
        break;

      default: {
        pSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 0, w: 12.2, h: 0.95,
          fill: { color: LIGHT_BG }, line: { type: "none" },
        });
        pSlide.addText(slide.baslik || ic.baslik || "Detay", {
          x: 0.4, y: 0.18, w: 11.5, h: 0.55,
          fontSize: 22, bold: true, color: DARK,
        });
        if (ic.ana_baslik) {
          pSlide.addText(ic.ana_baslik, {
            x: 0.4, y: 1.05, w: 11.5, h: 0.45,
            fontSize: 15, bold: true, color: PRIMARY,
          });
        }
        (ic.noktalar || []).slice(0, 7).forEach((n, i) => {
          pSlide.addShape(pptx.ShapeType.rect, {
            x: 0.3, y: 1.6 + i * 0.65, w: 12.1, h: 0.58,
            fill: { color: i % 2 === 0 ? LIGHT_BG : WHITE },
            line: { type: "none" }, rectRadius: 0.08,
          });
          pSlide.addText(`→  ${n}`, {
            x: 0.5, y: 1.68 + i * 0.65, w: 11.7, h: 0.42,
            fontSize: 13, color: DARK, wrap: true,
          });
        });
        if (ic.vurgu) {
          pSlide.addShape(pptx.ShapeType.rect, {
            x: 0.3, y: 6.4, w: 12.1, h: 0.48,
            fill: { color: PRIMARY }, line: { color: PRIMARY, pt: 0.5 }, rectRadius: 0.08,
          });
          pSlide.addText(ic.vurgu, {
            x: 0.5, y: 6.48, w: 11.7, h: 0.3,
            fontSize: 13, bold: true, color: WHITE,
          });
        }
        break;
      }
    }
  }

  const safeName = (sunumData.sunum_basligi || firmaAdi || "sunum")
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "")
    .replace(/\s+/g, "_");
  const dosyaAdi = `${safeName}_${versiyon}.pptx`;

  await pptx.writeFile({ fileName: dosyaAdi });
  return dosyaAdi;
}

/**
 * İç notlar için ayrı bir PPTX üretir (maliyet, müzakere, riskler).
 */
export async function pptxIcNotlarUret(icVersiyon, tema, logoUrl, firmaAdi) {
  if (!icVersiyon) throw new Error("İç versiyon verisi yok");

  const slides = [
    {
      no: 1, tip: "kapak",
      baslik: "İç Notlar",
      icerik: {
        ana_baslik: `${firmaAdi} — İç Notlar`,
        alt_baslik: "Gizli — sadece ajans ekibi için",
        tarih: new Date().toLocaleDateString("tr-TR"),
      },
    },
    {
      no: 2, tip: "ozel",
      baslik: "Stratejik Özet",
      icerik: { noktalar: [icVersiyon.ozet || "—"], vurgu: icVersiyon.not || "" },
    },
  ];

  // Maliyet
  if (icVersiyon.maliyet_tahmini?.kalemler?.length > 0) {
    const m = icVersiyon.maliyet_tahmini;
    slides.push({
      no: slides.length + 1, tip: "ozel",
      baslik: `Maliyet Tahmini (${m.toplam_min || 0}–${m.toplam_max || 0} ${m.para_birimi || "EUR"})`,
      icerik: {
        noktalar: m.kalemler.map((k) => `${k.hizmet}: ${k.min}–${k.max} (${k.aciklama || ""})`),
      },
    });
  }

  if (icVersiyon.muzakere_noktalari?.length > 0) {
    slides.push({
      no: slides.length + 1, tip: "ozel",
      baslik: "Müzakere Noktaları",
      icerik: { noktalar: icVersiyon.muzakere_noktalari },
    });
  }
  if (icVersiyon.riskler?.length > 0) {
    slides.push({
      no: slides.length + 1, tip: "ozel",
      baslik: "Riskler",
      icerik: { noktalar: icVersiyon.riskler },
    });
  }
  if (icVersiyon.firsatlar?.length > 0) {
    slides.push({
      no: slides.length + 1, tip: "ozel",
      baslik: "Fırsatlar (Upsell)",
      icerik: { noktalar: icVersiyon.firsatlar },
    });
  }
  if (icVersiyon.rakip_zayifliklari?.length > 0) {
    slides.push({
      no: slides.length + 1, tip: "rakip",
      baslik: "Rakip Zayıflıkları",
      icerik: { zayiflar: icVersiyon.rakip_zayifliklari, firsatlar: icVersiyon.firsatlar || [] },
    });
  }
  if (icVersiyon.oncelikli_hizmetler?.length > 0) {
    slides.push({
      no: slides.length + 1, tip: "ozel",
      baslik: "Öncelikli Hizmetler",
      icerik: { noktalar: icVersiyon.oncelikli_hizmetler },
    });
  }

  return pptxUret(
    { sunum_basligi: `${firmaAdi}_ic_notlar`, slides },
    tema, logoUrl, firmaAdi, "ic_notlar"
  );
}