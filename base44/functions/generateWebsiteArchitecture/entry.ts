import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TOOL_LABELS = {
  base44: "Base44", kimya: "Kimya", google_antigravity: "Google Antigravity",
  cursor: "Cursor", bolt: "Bolt.new", lovable: "Lovable", other: "AI aracı"
};

const SITE_TYPE_LABELS = {
  kurumsal: "Kurumsal Tanıtım", "e-ticaret": "E-Ticaret", portfolio: "Portfolio",
  landing: "Landing Page", blog: "Blog", rezervasyon: "Rezervasyon Sistemi"
};

const DESIGN_STYLE_DETAILS = {
  minimal: "Minimal — çok beyaz alan, ince çizgiler, düşük kontrast, grid-based layout, maksimum 2-3 renk, hidden navigation, full-width imagery, subtle hover states",
  modern: "Modern — clean layout, asymmetric grids, bold typography, gradient overlays, card-based UI, floating elements, sticky navigation",
  bold: "Bold/Cesur — büyük tipografi (120px+ hero başlıklar), yüksek kontrast, full-bleed görseller, overlap layouts, broken grid, loud color blocking",
  elegant: "Elegant — serif başlık fontları (Playfair Display, Cormorant), ince sans-serif gövde, altın/bronz aksanlar, fazla beyaz alan, film gibi hero bölümleri, fade-in animasyonlar",
  playful: "Eğlenceli/Playful — yuvarlak şekiller, blob morph arka planlar, canlı gradientler, bouncy animasyonlar, hand-drawn elementler, emoji kullanımı, organic layout",
  brutalist: "Brutalist — ham tipografi, mono-space fontlar, görünür grid, glitch efektleri, anti-design, siyah-beyaz ağırlıklı, cursor-driven interactions",
  glassmorphism: "Glassmorphism — buzlu cam efekti (backdrop-filter: blur), yarı-saydam paneller, subtle borders, gradient backgrounds, depth layering, frosted overlays",
  neomorphism: "Neomorphism — yumuşak gölge ve parlama (box-shadow inset/outset), monokromatik, kabartma butonlar, light UI, subtle depth without borders",
  retro: "Retro — nostaljik renk paleti (turuncu, kahverengi, bej), serif veya slab-serif fontlar, grain/noise texture overlay, vintage fotoğraf filtreleri, rounded corners, analog his",
  corporate: "Kurumsal — güven veren koyu mavi/gri palette, sans-serif fontlar (Inter, DM Sans), structured grid, icon-driven sections, professional imagery, data visualization"
};

const COLOR_MOOD_DETAILS = {
  light_airy: "Açık & Ferah — #FFFFFF arka plan, pastel aksan renkleri, soft shadows, yüksek beyaz alan oranı, gentle gradient",
  dark_premium: "Koyu & Premium — #0A0A0A veya #111827 arka plan, altın/amber/neon aksan, glow efektleri, cinematic hero, dark card UI",
  vibrant_colorful: "Canlı & Renkli — parlak gradientler, neon aksan renkleri, color blocking, vibrant illustrations, energetic palette",
  muted_pastel: "Soft Pastel — düşük saturasyon, pudra tonları, watercolor his, gentle shadows, dreamy atmosphere",
  monochrome: "Monokrom — tek renk ailesi + siyah & beyaz, minimal palette, tipografi odaklı, elegant kontrast",
  brand_colors: "Marka Renkleri — firmanın kendi renk paletini birincil ve ikincil renkler olarak kullan"
};

const ANIMATION_DETAILS = {
  scroll_reveal: "SCROLL REVEAL ANİMASYONLARI:\n- Elemanlar viewport'a girdiğinde fade-in + translateY(30px→0) veya scale(0.95→1)\n- Staggered reveal: çoklu elemanlar sırayla 100ms farkla beliriyor\n- Intersection Observer ile lazy triggering\n- Kullanılacak kütüphane: GSAP ScrollTrigger veya Framer Motion whileInView\n- Her section için farklı reveal pattern: slide-up, slide-left, fade-scale, clip-path reveal",

  parallax: "PARALLAX EFEKTLER:\n- Multi-layer parallax: arka plan -0.3x, orta katman -0.1x, ön plan 0x hız\n- Horizontal parallax scroll sections (yatay kaydırma)\n- Parallax hero: büyük arka plan görseli yavaş hareket ederken başlık sabit\n- Depth illusion: z-index katmanlarıyla derinlik hissi\n- Rellax.js veya GSAP ScrollTrigger kullan\n- Sticky sections: bir section sabitlenirken içerik değişiyor (pin + scrub)",

  mouse_track: "MOUSE TRACKİNG ANİMASYONLARI:\n- Cursor follower: özel cursor tasarımı (blend-mode: difference veya custom shape)\n- Tilt efekti: kartlar fare pozisyonuna göre 3D rotate (rotateX/rotateY max 15deg)\n- Magnetic buttons: butonlar fareye yaklaştığında mıknatıs gibi çekilir\n- Spotlight/gradient follow: fareyi takip eden ışık/gradient efekti\n- Eyes follow cursor: illüstrasyon elemanları fareyi takip eder\n- Parallax on mousemove: arka plan elemanları fare hareketine tepki verir",

  "3d_elements": "3D ELEMANLAR VE EFEKTLER:\n- CSS 3D Transforms: perspective(1000px), rotateX/Y, translateZ ile gerçek derinlik\n- 3D card flip: hover'da kartlar 180° dönerek arka yüzü gösterir (backface-visibility)\n- Three.js/R3F entegrasyonu: 3D model viewer, interaktif 3D sahne, floating 3D objects\n- Isometric 3D grid layout: izometrik açıyla yerleştirilmiş kartlar\n- 3D text extrusion: başlıklara derinlik ve gölge (CSS text-shadow katmanlama veya Three.js TextGeometry)\n- 3D parallax layers: birden fazla katman translateZ ile gerçek 3D derinlik\n- Spline/Lottie 3D animasyonlar: web-optimized 3D sahneler\n- Floating 3D objects: havada süzülen geometrik şekiller veya ürün görselleri\n- 3D carousel/slider: perspektif ile dönen slayt gösterisi\n- WebGL shader efektleri: distortion, wave, ripple, noise displacement",

  micro_interactions: "MICRO INTERACTIONS:\n- Button hover: scale, glow, ripple, background slide, icon morph\n- Form focus: input border animation, floating label, shake on error\n- Toggle switches: smooth thumb transition, color morph\n- Like/favorite: particle burst, heart pop animation\n- Copy to clipboard: checkmark morph, tooltip fade\n- Progress indicators: circular, linear, step-based ile smooth transitions\n- Skeleton loading → content fade-in transition",

  page_transitions: "SAYFA GEÇİŞ ANİMASYONLARI:\n- Crossfade: sayfalar arası opacity transition (300-500ms)\n- Slide transitions: yeni sayfa yandan kayarak girer\n- Curtain/wipe: perde açılma efekti ile sayfa geçişi\n- Shared layout animation: ortak elemanlar pozisyon değiştirir (Framer Motion layoutId)\n- Route-based animation: her rota için farklı giriş/çıkış animasyonu\n- Barba.js veya Next.js page transitions pattern",

  text_animations: "METİN ANİMASYONLARI:\n- Typewriter efekti: karakterler tek tek yazılır (cursor yanıp sönüyor)\n- Split text reveal: her harf/kelime ayrı ayrı fade-in veya slide-up\n- Gradient text animation: renk gradyanı yavaşça kayar (background-clip: text)\n- Text scramble/decode: harfler rastgele dönüp doğru metne ulaşır\n- Counter/number animation: sayılar 0'dan hedefe doğru sayar\n- Marquee/ticker: sürekli kayan metin bandı\n- Highlight animation: metin üzerinde yavaşça beliren sarı/renkli highlight",

  loading_animations: "YÜKLEME ANİMASYONLARI:\n- Custom preloader: logo animasyonu ile sayfa yükleme ekranı (progress bar veya circular)\n- Skeleton screens: içerik yüklenirken gri placeholder shimmer\n- Progressive image loading: blur-up tekniği (düşük çözünürlük → net)\n- Content placeholder → fade-in geçişi\n- Branded loading spinner: firma logosundan esinlenen dönen animasyon"
};

const ANIMATION_INTENSITY_DETAILS = {
  subtle: `YOĞUNLUK: HAFİF & ZARİF
- Animasyonlar ince ve fark edilir-fark edilmez olmalı; kullanıcıyı yormamalı
- Süreler kısa-orta (200-400ms), easing yumuşak (ease-out)
- Hareket mesafeleri küçük: translateY max 20px, scale 0.97-1, opacity geçişleri öncelikli
- 3D seçildiyse: max 8deg tilt, hafif derinlik; agresif rotasyon YOK
- Parallax seçildiyse: düşük multiplier (0.05-0.15x)
- Genel his: profesyonel, sakin, premium — gösterişten uzak`,
  balanced: `YOĞUNLUK: DENGELİ
- Animasyonlar net şekilde fark edilir ama abartısız
- Süreler orta (300-600ms), staggered reveal'lar kullan
- 3D seçildiyse: 12-15deg tilt, belirgin derinlik
- Parallax seçildiyse: orta multiplier (0.15-0.35x)
- Hero ve önemli section'larda dikkat çekici, diğerlerinde ölçülü
- Genel his: modern, canlı ama dengeli`,
  intense: `YOĞUNLUK: YOĞUN & GÖSTERİŞLİ (WOW EFEKTİ)
- Animasyonlar deneyimsel ve vurucu olmalı; sitenin kendisi bir gösteri
- Çoklu katmanlı, eşzamanlı animasyonlar; cinematic giriş sahneleri
- 3D seçildiyse: tam Three.js/WebGL sahne, interaktif 3D objeler, agresif derinlik ve rotasyon, shader efektleri
- Parallax seçildiyse: yüksek multiplier (0.3-0.6x), pinned scroll-scrub section'lar, horizontal scroll bölümleri
- Mouse tracking seçildiyse: tüm sayfada cursor-driven efektler, magnetic elementler, spotlight takibi
- Custom preloader, sayfa geçiş sahneleri, scroll-triggered timeline'lar (GSAP)
- Genel his: ödüllü (Awwwards seviyesi), deneyimsel, akılda kalıcı — performansı korumak için lazy-load ve will-change optimizasyonu belirt`,
};

// AI çıktısından ilk DENGELİ JSON nesnesini çıkar — JSON sonrası fazladan metin/markdown/ikinci bloğu tolere eder.
// "Unexpected non-whitespace character after JSON" hatasının kök çözümü.
function extractJson(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  let text = String(raw).trim();

  // Markdown kod bloğu çitlerini soy (```json ... ```)
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // 1) Doğrudan dene
  try { return JSON.parse(text); } catch (_) {}

  // 2) İlk '{' den başlayıp string/escape'leri dikkate alarak dengeli ilk nesneyi tara
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch (_) { return null; }
      }
    }
  }
  return null;
}

// Üst güvenlik sınırı için timeout helper — özel hata mesajı ile (aiInvoke kendi dinamik timeout'unu yönetir)
async function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("WEB_ARCH_TIMEOUT")), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, revision_feedback } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id gerekli' }, { status: 400 });

    const project = await base44.entities.WebsiteProject.get(project_id);
    if (!project) return Response.json({ error: 'Proje bulunamadı' }, { status: 404 });

    const toolLabel = project.ai_tool === "other"
      ? (project.ai_tool_other || "AI aracı")
      : TOOL_LABELS[project.ai_tool] || "Base44";

    const featuresList = (project.features || []).join(", ") || "belirtilmemiş";
    const refLinks = (project.reference_links || []).filter(Boolean);
    const pageCount = project.page_count || 5;
    const siteTypeLabel = SITE_TYPE_LABELS[project.site_type] || project.site_type || "kurumsal";
    const designStyle = project.design_style || "modern";
    const colorMood = project.color_mood || "brand_colors";
    const animTypes = project.animation_types || [];
    const animIntensity = project.animation_intensity || "balanced";
    const oldContent = project.old_website_content || {};

    // ━━━ Şirket bilgileri zenginleştirme ━━━
    let companyBlock = "";
    let brandPalette = [];
    try {
      const [comp, styles] = await Promise.all([
        base44.asServiceRole.entities.Company.filter({ name: project.company_name }, "-created_date", 1),
        project.company_id
          ? base44.asServiceRole.entities.StyleMemory.filter({ company_id: project.company_id }, "-updated_date", 1).catch(() => [])
          : Promise.resolve([]),
      ]);
      const c = comp[0];
      if (c) {
        const parts = [];
        if (c.brand_description) parts.push(`Marka Tanımı: ${c.brand_description}`);
        if (c.target_audience) parts.push(`Hedef Kitle: ${c.target_audience}`);
        if (c.sector) parts.push(`Sektör: ${c.sector}`);
        if (c.brand_keywords?.length) parts.push(`Anahtar Kelimeler: ${c.brand_keywords.join(", ")}`);
        // Kullanıcı wizard'da paleti düzenlediyse proje paleti öncelikli; yoksa firma paleti
        const effectivePalette = (project.color_palette?.length ? project.color_palette : c.color_palette) || [];
        if (effectivePalette.length) { parts.push(`Marka Renkleri: ${effectivePalette.join(", ")}`); brandPalette = effectivePalette; }
        if (c.agreed_services?.length) parts.push(`Sunulan Hizmetler: ${c.agreed_services.join(", ")}`);
        if (c.contact_person) parts.push(`İletişim Kişisi: ${c.contact_person}`);
        if (c.phone) parts.push(`Telefon: ${c.phone}`);
        if (c.email) parts.push(`E-posta: ${c.email}`);
        if (c.website) parts.push(`Mevcut Web: ${c.website}`);
        const socials = c.social_handles || {};
        const socialStr = Object.entries(socials).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(" | ");
        if (socialStr) parts.push(`Sosyal Medya: ${socialStr}`);

        // Marka sesi
        if (c.brand_voice_guide) {
          let voice = null;
          try { voice = typeof c.brand_voice_guide === "string" ? JSON.parse(c.brand_voice_guide) : c.brand_voice_guide; } catch (_) {}
          if (voice?.ton_sifatlari?.length) parts.push(`Marka Tonu: ${voice.ton_sifatlari.join(", ")}`);
          if (voice?.hitap_bicimi) parts.push(`Hitap Biçimi: ${voice.hitap_bicimi}`);
        }

        // Stil hafızası
        const sm = styles[0];
        if (sm?.prompt_injection) parts.push(`Görsel Stil DNA: ${sm.prompt_injection}`);
        if (sm?.mood_tags?.length) parts.push(`Görsel Mood: ${sm.mood_tags.join(", ")}`);

        companyBlock = parts.join("\n");
      }
    } catch (_) {}

    // ━━━ Referans site analizi ━━━
    let refAnalysis = "";
    if (refLinks.length > 0) {
      const analyses = [];
      for (const url of refLinks.slice(0, 3)) {
        try {
          const metaRes = await base44.asServiceRole.functions.invoke("fetchUrlMetadata", { url });
          const meta = metaRes.data || metaRes;
          const headingsStr = (meta.headings || []).length ? ` | Bölüm başlıkları: ${meta.headings.join(" / ")}` : "";
          analyses.push(`• ${url} — ${meta.title || "Başlık yok"}: ${meta.description || "Açıklama yok"}${headingsStr} (domain: ${meta.domain || "—"})`);
        } catch (_) {
          analyses.push(`• ${url} — (analiz edilemedi)`);
        }
      }
      refAnalysis = analyses.join("\n");
    }

    // ━━━ Tasarım detay blokları ━━━
    const designBlock = DESIGN_STYLE_DETAILS[designStyle] || DESIGN_STYLE_DETAILS.modern;
    const colorBlock = COLOR_MOOD_DETAILS[colorMood] || COLOR_MOOD_DETAILS.brand_colors;
    const paletteStr = brandPalette.length > 0 ? `\nMarka Renk Paleti: ${brandPalette.join(", ")}` : "";

    // ━━━ Animasyon blokları ━━━
    let animBlock = "";
    if (animTypes.length > 0) {
      const details = animTypes.map(t => ANIMATION_DETAILS[t]).filter(Boolean);
      const intensityBlock = ANIMATION_INTENSITY_DETAILS[animIntensity] || ANIMATION_INTENSITY_DETAILS.balanced;
      animBlock = `\n━━━ ANİMASYON & EFEKT GEREKSİNİMLERİ ━━━
${intensityBlock}

--- Seçilen animasyon türleri (yukarıdaki yoğunluk seviyesine göre uygula) ---
${details.join("\n\n")}

ÖNEMLİ: Yukarıdaki animasyon ve efekt detaylarını promptta MUTLAKA kullan ve belirtilen YOĞUNLUK seviyesine harfiyen uy. Her section için hangi animasyonun, hangi yoğunlukta uygulanacağını spesifik olarak belirt. 3D seçildiyse Three.js/CSS 3D Transforms kodlama talimatlarını yoğunluk seviyesine uygun şekilde açıkça yaz. Parallax seçildiyse yoğunluğa göre katman hızlarını ve scroll multiplier değerlerini ver. Mouse tracking seçildiyse cursor efektlerini yoğunluğa göre detaylandır.`;
    }

    // ━━━ Eski site içeriği bloğu ━━━
    let oldSiteBlock = "";
    {
      const oc = oldContent;
      const parts = [];
      if (oc.firma_tanitimi) parts.push(`Firma Tanıtımı: ${oc.firma_tanitimi}`);
      if (oc.hakkimizda) parts.push(`Hakkımızda: ${oc.hakkimizda}`);
      if (oc.misyon) parts.push(`Misyon: ${oc.misyon}`);
      if (oc.vizyon) parts.push(`Vizyon: ${oc.vizyon}`);
      if (Array.isArray(oc.degerler) && oc.degerler.length) parts.push(`Değerler: ${oc.degerler.join(", ")}`);
      if (Array.isArray(oc.urunler_hizmetler) && oc.urunler_hizmetler.length) parts.push(`Ürünler/Hizmetler: ${oc.urunler_hizmetler.join(", ")}`);
      if (Array.isArray(oc.musteri_yorumlari) && oc.musteri_yorumlari.length) parts.push(`Müşteri Yorumları: ${oc.musteri_yorumlari.slice(0, 6).map(y => `"${y}"`).join(" | ")}`);
      const il = oc.iletisim || {};
      const ilStr = [il.telefon && `Tel: ${il.telefon}`, il.email && `E-posta: ${il.email}`, il.adres && `Adres: ${il.adres}`].filter(Boolean).join(" | ");
      if (ilStr) parts.push(`İletişim: ${ilStr}`);
      if (Array.isArray(oc.one_cikan_bilgiler) && oc.one_cikan_bilgiler.length) parts.push(`Öne Çıkan: ${oc.one_cikan_bilgiler.join(", ")}`);
      if (parts.length) {
        oldSiteBlock = `\n━━━ FİRMANIN MEVCUT SİTE İÇERİĞİ (${project.old_website_url || ""}) ━━━
${parts.join("\n")}

BU İÇERİĞİ KULLAN: Yeni sitenin section'larını ve metinlerini bu gerçek içeriğe dayandır. Hakkımızda, misyon, vizyon, ürünler ve müşteri yorumları bölümlerini bu bilgilerle doldur. Mevcut içeriği aynen kopyalama — yeni tasarıma uygun şekilde yeniden yaz ve güçlendir, ama gerçek bilgileri (ürün adları, değerler, yorumlar, iletişim) koru.`;
      }
    }

    // ━━━ ANA PROMPT ━━━
    const systemPrompt = `Sen dünya çapında ödüllü bir web tasarım direktörü ve UX mimarısın. Awwwards, CSS Design Awards ve FWA jüri üyesisin. Her projeye benzersiz, sektöre ve markaya özel bir yaklaşım getirirsin.

SENİN FARKLI YAKLAŞIMIN:
1. MARKA DNA ANALİZİ — Önce firmayı derinlemesine anla: sektör, hedef kitle, ton, değerler. Sonra bunları tasarım diline çevir.
2. REFERANS YORUMLAMA — Referans sitelerdeki tasarım dilini analiz et (layout pattern, tipografi hiyerarşisi, beyaz alan kullanımı, etkileşim kalıpları), kopyalama değil YORUMLAMA yap.
3. TEKNİK DERİNLİK — Her section için: layout yapısı, CSS/JS teknikleri, animasyon detayları, responsive davranış.
4. BENZERSİZLİK — Her proje birbirinden farklı olmalı. Aynı sektördeki iki firma bile farklı tasarım yaklaşımlarıyla sunulmalı.

ASLA YAPMA:
❌ Her proje için aynı "Hero + About + Services + Contact" kalıbını kullanma
❌ "Modern ve profesyonel görünüm" gibi jenerik ifadeler kullanma
❌ Animasyonları es geçme veya "gerekirse eklenebilir" deme — seçildiyse ZORUNLU ve DETAYLI olarak belirt
❌ Renk ve font önerilerini marka bağlamından bağımsız yapma`;

    let userPrompt = `━━━ PROJE BRİEFİ ━━━
Firma: ${project.company_name || "—"}
Sektör: ${project.sector || "—"}
Site Tipi: ${siteTypeLabel}
Sayfa Sayısı: ${pageCount}
Özellikler: ${featuresList}
AI Araç: ${toolLabel}
${project.extra_specs ? `Özel Notlar: ${project.extra_specs}` : ""}

${companyBlock ? `━━━ FİRMA PROFİLİ ━━━\n${companyBlock}` : ""}

━━━ TASARIM YÖNERGE ━━━
Tasarım Stili: ${designBlock}
Renk Modu: ${colorBlock}${paletteStr}

${oldSiteBlock}

${refAnalysis ? `━━━ REFERANS SİTE ANALİZİ ━━━\n${refAnalysis}\n\nBu referanslardan ilham al: Layout pattern'lerini, tipografi hiyerarşilerini, beyaz alan kullanımlarını ve etkileşim kalıplarını analiz et. Doğrudan kopyalama — markanın kimliğiyle sentezleyerek benzersiz bir yorumlama yap.` : ""}
${animBlock}

━━━ BEKLENEN ÇIKTI ━━━
Aşağıdaki JSON yapısını AYNEN kullan. TÜRKÇE. Her sayfa için 4-8 detaylı section.

{
  "ozet": "3-4 cümle proje özeti — tasarım vizyonu, teknik yaklaşım ve hedeflenen kullanıcı deneyimi",
  "pages": [
    {
      "title": "Sayfa Adı",
      "slug": "/url-path",
      "headline": "Sayfanın ana başlığı — güçlü ve markaya uygun",
      "sections": [
        "Hero: [DETAYLI AÇIKLAMA — layout yapısı, görsel düzen, animasyon davranışı, responsive plan]",
        "Section Name: [Her section için minimum 2-3 cümle teknik açıklama]"
      ]
    }
  ],
  "design": {
    "primary_color": "#hex — neden bu renk seçildi",
    "secondary_color": "#hex",
    "accent_color": "#hex",
    "style": "${designStyle} — uygulamaya özel yorumlama",
    "font_heading": "Font adı — neden bu font (Google Fonts'tan)",
    "font_body": "Font adı",
    "spacing": "Beyaz alan stratejisi — tight/normal/spacious"
  },
  "ai_prompt": "${toolLabel} için HAZIR, KOPYALA-YAPIŞTIR prompt. Bu prompt tek başına verildiğinde ${toolLabel}'nin TÜM siteyi baştan sona oluşturabileceği kadar detaylı olmalı. İçermeli: 1) Genel tasarım vizyonu ve stil 2) Her sayfa ve section detayı 3) Renk paleti ve tipografi 4) TÜM animasyon/efekt talimatları (seçildiyse) 5) Responsive davranış kuralları 6) Firma bilgileri ve içerik yönergeleri. Minimum 800 kelime.",
  "seo_notes": "Teknik SEO tavsiyeleri — meta yapısı, sayfa hızı, schema markup, URL stratejisi"
}

KURALLAR:
- sections içindeki her eleman, o section'ın layout'unu, içeriğini, animasyonunu ve responsive davranışını açıklamalı
- ai_prompt alanı EN ÖNEMLİ çıktı — bu prompt ${toolLabel}'ye verildiğinde profesyonel, benzersiz, tam işlevsel bir site oluşturmalı
- Firma iletişim bilgilerini (telefon, e-posta, adres, sosyal medya) ilgili sayfalara doğal şekilde entegre et
- ${animTypes.length > 0 ? `SEÇİLEN ANİMASYONLAR ZORUNLU: ${animTypes.join(", ")} — her birini ai_prompt'ta teknik detaylarıyla ve "${animIntensity}" yoğunluk seviyesine uygun şekilde belirt` : "Animasyon istenmemiş — temiz ve performanslı bir tasarım öner"}
- ${oldSiteBlock ? "FİRMANIN MEVCUT SİTE İÇERİĞİ verildi — section metinlerini ve içerikleri bu gerçek bilgilere dayandır (hakkımızda, misyon, vizyon, ürünler, yorumlar)" : ""}
- Sadece JSON döndür`;

    if (revision_feedback) {
      const prev = JSON.stringify(project.architecture || {}).substring(0, 1200);
      userPrompt += `\n\n━━━ REVİZYON TALEBİ ━━━\nKullanıcı Geri Bildirimi: "${revision_feedback}"\nÖnceki Mimari (özet): ${prev}\nBu geri bildirime göre güncelle. Değiştirilmeyen kısımları koru.`;
    }

    // Timeout YÖNETİMİ aiInvoke'a bırakıldı — orada modele göre dinamik (60-295sn) timeout var.
    // Burada yalnızca bir üst güvenlik sınırı (300sn) tutuyoruz ki yavaş model seçildiğinde
    // dış çağrı içerideki gerçek timeout'tan önce kesilmesin (eski 60sn çakışması düzeltildi).
    let result;
    try {
      let aiRes;
      try {
        aiRes = await withTimeout(base44.asServiceRole.functions.invoke("aiInvoke", {
          task_type: "web_architecture",
          system_prompt: systemPrompt,
          prompt: userPrompt,
          json_mode: true,
          skip_cache: true,
          max_tokens: 9000,
        }), 300000);
      } catch (invokeErr) {
        if (invokeErr.message === "WEB_ARCH_TIMEOUT") {
          await base44.entities.WebsiteProject.update(project_id, { generation_status: "error" });
          try {
            await base44.asServiceRole.entities.AIErrorLog.create({
              function_name: "generateWebsiteArchitecture",
              task_type: "web_architecture",
              error_message: "AI yanıt vermedi (300sn üst sınır aşıldı). Seçili model çok yavaş olabilir.",
              error_type: "timeout",
              context_info: project.company_name || project.project_name || "",
              prompt_preview: userPrompt.slice(0, 300),
              resolved: false,
            });
          } catch (_) {}
          return Response.json({ error: "AI yanıt vermedi. Ayarlar'dan daha hızlı bir varsayılan model seçip tekrar deneyin." }, { status: 504 });
        }
        const code = invokeErr.response?.status;
        throw new Error(`aiInvoke çağrısı başarısız${code ? ` (HTTP ${code})` : ""}: ${invokeErr.response?.data?.error || invokeErr.message}`);
      }
      const aiData = aiRes.data || aiRes;
      if (aiData?.error) throw new Error(aiData.error);
      result = extractJson(aiData.result) || {};
    } catch (e) {
      throw e;
    }

    // Eksik #9 — Şema doğrulama: AI eksik/boş üretirse sessizce kaydetme
    if (!result || !Array.isArray(result.pages) || result.pages.length === 0 || !result.ai_prompt || result.ai_prompt.length < 200) {
      await base44.entities.WebsiteProject.update(project_id, { generation_status: "error" });
      try {
        await base44.asServiceRole.entities.AIErrorLog.create({
          function_name: "generateWebsiteArchitecture",
          task_type: "web_architecture",
          error_message: `Eksik AI çıktısı — sayfa: ${result?.pages?.length || 0}, ai_prompt uzunluk: ${result?.ai_prompt?.length || 0}. Yanıt kesilmiş olabilir.`,
          error_type: "parse_error",
          context_info: project.company_name || project.project_name || "",
          prompt_preview: userPrompt.slice(0, 300),
          resolved: false,
        });
      } catch (_) {}
      return Response.json({ error: "AI eksik çıktı üretti (yanıt kesilmiş olabilir). Lütfen tekrar deneyin." }, { status: 502 });
    }

    const architecture = {
      pages: (result.pages || []).map((p) => ({
        title: p.title,
        slug: p.slug,
        purpose: p.headline || "",
        sections: (p.sections || []).map((s) => {
          const [name, ...rest] = String(s).split(":");
          return { name: name.trim(), content: rest.join(":").trim(), layout: "" };
        }),
        draft_texts: { headline: p.headline || "", subtext: "", cta: "" }
      })),
      color_suggestion: result.design?.primary_color || "",
      secondary_color: result.design?.secondary_color || "",
      accent_color: result.design?.accent_color || "",
      font_heading: result.design?.font_heading || "",
      font_body: result.design?.font_body || "",
      font_suggestion: `${result.design?.font_heading || ""} / ${result.design?.font_body || ""}`,
      spacing: result.design?.spacing || "",
      seo_notes: result.seo_notes || "",
      estimated_complexity: result.design?.style || "",
      ozet: result.ozet || "",
    };

    const generated_prompts = {
      tool: project.ai_tool,
      tool_label: toolLabel,
      main_prompt: result.ai_prompt || "",
      page_prompts: (result.pages || []).map((p) => ({
        page_title: p.title,
        prompt: `${p.title} sayfası: ${p.headline || ""}\nBölümler: ${(p.sections || []).join(" | ")}`
      })),
      generated_at: new Date().toISOString(),
    };

    const updatePayload = {
      architecture,
      generated_prompts,
      generation_status: "completed",
      delivery_status: "Mimari Hazırlandı",
    };

    if (revision_feedback) {
      updatePayload.revision_feedback = revision_feedback;
      updatePayload.revision_count = (project.revision_count || 0) + 1;
    }

    await base44.entities.WebsiteProject.update(project_id, updatePayload);
    return Response.json({ success: true, architecture, generated_prompts });
  } catch (error) {
    console.error("generateWebsiteArchitecture error:", error);
    try {
      const base44svc = createClientFromRequest(req);
      const errType = error.message?.toLowerCase().includes("json") || error.message?.toLowerCase().includes("parse")
        ? "parse_error"
        : error.message?.includes("zaman aşımı") ? "timeout" : "api_error";
      await base44svc.asServiceRole.entities.AIErrorLog.create({
        function_name: "generateWebsiteArchitecture",
        task_type: "web_architecture",
        error_message: error.message || String(error),
        error_type: errType,
        resolved: false,
      });
    } catch (_) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});