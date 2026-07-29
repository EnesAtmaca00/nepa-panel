// Sunum üretim akışı — Researcher → Drafter → Deployer
// callAI'yi kullanır, AgentWorkflowLog'a step kayıt düşer.
import { callAI, logAgentStep, newWorkflowId } from "@/lib/aiEngine";

/**
 * 1. Aşama — Researcher: ham metinden bilgi çıkar, eksikleri tespit et.
 * @returns {Promise<{musteri_adi, konum, sektor, tespit_edilen_hizmetler, sorular}>}
 */
export async function askMissingInfo({ inputText, settings, workflowId }) {
  const systemPrompt = `Sen bir ajans danışmanısın. Müşteri sunumu hazırlamak için kritik bilgiler eksikse sor.
SADECE gerçekten gerekli, kısa ve net sorular sor. Maksimum 4 soru.
SADECE JSON döndür: {"sorular": ["Soru 1?", "Soru 2?"], "tespit_edilen_hizmetler": ["hizmet1"], "musteri_adi": "...", "konum": "...", "sektor": "..."}`;

  const userPrompt = `Bu metinden sunum hazırlayacağım. Eksik kritik bilgileri belirle:
"${inputText}"

Tespit edilen hizmetleri ve müşteri bilgilerini de çıkar.`;

  const res = await callAI({
    taskType: "presentation_research",
    systemPrompt,
    userPrompt,
    jsonMode: true,
    settings,
    maxTokens: 1000,
  });

  await logAgentStep({
    workflowId,
    role: "researcher",
    status: "completed",
    taskType: "presentation_research",
    inputData: { input_preview: inputText.substring(0, 300) },
    outputData: res.parsed || { raw: res.text?.substring(0, 300) },
    model: res.model,
    handoffData: { nextAgent: "drafter" },
  });

  return res.parsed || {
    sorular: [],
    tespit_edilen_hizmetler: [],
    musteri_adi: "",
    konum: "",
    sektor: "",
  };
}

/**
 * 2. Aşama — Drafter: tüm bilgileri al, profesyonel sunum içeriği üret.
 */
export async function generatePresentation({
  inputText,
  musteri_adi,
  konum,
  sektor,
  hizmetler = [],
  ek_bilgiler = "",
  meeting_date = "",
  agency_name = "Ajans",
  agency_email = "",
  agency_phone = "",
  brandVoiceSummary = "",
  colorPalette = [],
  settings,
  workflowId,
  revisionFeedback = "",
  previousSlides = null,
  contextSystemPrompt = null,
}) {
  const today = new Date().toLocaleDateString("tr-TR");

  // GÜNCELLEME 1: Akıllı slide sayısı + max_tokens — brief uzunluğuna göre
  const metinUzunlugu = (inputText || "").length;
  const slideHedefi = metinUzunlugu < 500 ? 6 : metinUzunlugu < 1500 ? 9 : 12;
  const maxTokens = metinUzunlugu < 500 ? 1400 : metinUzunlugu < 1500 ? 2000 : 2800;

  // MULTI-TENANT: contextSystemPrompt verilmişse onu kullan (firmaya özel bağlamlı),
  // yoksa generic system prompt'a düş.
  const systemPrompt = contextSystemPrompt || `Sen dünya standartlarında bir strateji danışmanı ve sunum uzmanısın. McKinsey kalitesinde, görsel açıdan güçlü, her detayı düşünülmüş sunumlar hazırlıyorsun.
${brandVoiceSummary ? `\nMarka sesi: ${brandVoiceSummary}` : ""}
${colorPalette.length ? `\nRenk paleti: ${colorPalette.join(", ")}` : ""}

KURAL: SADECE geçerli JSON döndür. Başka hiçbir şey yazma. Markdown yok, kod bloğu yok, açıklama yok.`;

  const revisionNote = revisionFeedback
    ? `\n\n=== REVİZYON İSTEĞİ ===\n"${revisionFeedback}"\nÖnceki sunumu bu geri bildirime göre güncelle. Önceki içerik:\n${JSON.stringify(previousSlides || []).substring(0, 1500)}`
    : "";

  const userPrompt = `Aşağıdaki brief'i analiz et ve ${slideHedefi} slaytlık profesyonel sunum hazırla.

=== BRIEF ===
${inputText}
${ek_bilgiler ? "\n=== EK BİLGİLER ===\n" + ek_bilgiler : ""}
=== MÜŞTERİ ===
İsim: ${musteri_adi}
Konum: ${konum || "belirtilmedi"}
Sektör: ${sektor || "belirtilmedi"}
Tespit edilen hizmetler: ${hizmetler.join(", ") || "genel ajans hizmetleri"}
=== AJANS ===
Ajans: ${agency_name}
İletişim: ${agency_email || agency_phone || ""}
Toplantı tarihi: ${meeting_date || today}
=== BRIEF SONU ===${revisionNote}

Brief'teki HER konuyu işle. Başlıkları yüzeysel geçme — her slide gerçek strateji, analiz ve öneri içersin.

ZORUNLU JSON FORMATI:
{
  "sunum_basligi": "etkileyici sunum başlığı",
  "kisa_ozet": "2 güçlü cümle — neden bu sunum önemli",
  "slides": [
    {
      "no": 1,
      "tip": "kapak|analiz|hizmetler|strateji|takvim|farklilasma|cta|rakip|ozel",
      "baslik": "Slide başlığı",
      "icerik": {
        "ana_baslik": "varsa büyük başlık",
        "alt_baslik": "varsa alt başlık",
        "noktalar": ["madde 1", "madde 2"],
        "hizmetler": [{"ad": "...", "aciklama": "detaylı açıklama", "sure": "..."}],
        "aylar": [{"ay": "1. Ay", "baslik": "...", "icerikler": ["..."]}],
        "zayiflar": ["rakip zayıf yönleri"],
        "firsatlar": ["bizim fırsatlarımız"],
        "vurgu": "öne çıkan cümle/stat",
        "adimlar": ["adım 1", "adım 2"],
        "iletisim": "iletişim bilgisi",
        "tarih": "tarih"
      }
    }
  ],
  "proje_takvimi_ozeti": "3-6 aylık proje özeti",
  "ikna_argumanlari": ["Argüman 1", "Argüman 2"],
  "duz_metin_versiyonu": "Tüm sunumun WhatsApp veya email gönderimine uygun, akıcı Türkçe düz metin versiyonu. 4-5 paragraf. Satış odaklı, ikna edici."
}

ÖNEMLİ NOTLAR:
- Hedef ${slideHedefi} slayt — brief'te kaç farklı konu/görev varsa o kadar slide yap
- "ozel" tipli slide'lar için icerik objesine o konuya özgü alanlar ekle
- Rakip analizi varsa "rakip" tipli slide ile detaylı işle (zayiflar + firsatlar)
- Strateji önerileri varsa "strateji" tipli slide ile işle
- Tüm içerik Türkçe olsun (brief farklı dil belirtmedikçe)
- Her madde gerçek, uygulanabilir, sektöre özgü olsun — genel klişelerden kaçın
- İlk slide MUTLAKA "kapak" tipi, son slide MUTLAKA "cta" tipi olsun`;

  const res = await callAI({
    taskType: "presentation_draft",
    systemPrompt,
    userPrompt,
    jsonMode: true,
    settings,
    maxTokens,
  });

  await logAgentStep({
    workflowId,
    role: "drafter",
    status: "completed",
    taskType: "presentation_draft",
    inputData: { musteri: musteri_adi, hizmet_sayisi: hizmetler.length, revision: !!revisionFeedback },
    outputData: { slide_sayisi: res.parsed?.slides?.length || 0, model: res.model, fallback: !res.parsed },
    model: res.model,
    handoffData: { nextAgent: "deployer" },
  });

  // DÜZELTME 1: Parse başarısız olursa throw etme — fallback sunum üret
  // Böylece content (slides) hiçbir zaman null kalmaz, kullanıcı sunumu görebilir.
  if (!res.parsed || !Array.isArray(res.parsed.slides) || res.parsed.slides.length === 0) {
    return buildFallbackPresentation({
      musteri_adi, agency_name, agency_email, agency_phone,
      sektor, hizmetler, meeting_date, today,
    });
  }

  return res.parsed;
}

// DÜZELTME 1B: AI başarısız olursa kullanılacak fallback sunum şablonu
function buildFallbackPresentation({ musteri_adi, agency_name, agency_email, agency_phone, sektor, hizmetler, meeting_date, today }) {
  const hizmetListesi = (hizmetler && hizmetler.length > 0)
    ? hizmetler
    : ["Sosyal Medya Yönetimi", "Web Sitesi", "İçerik Üretimi"];
  const iletisim = agency_email || agency_phone || agency_name;

  return {
    sunum_basligi: `${agency_name} × ${musteri_adi}`,
    kisa_ozet: `${musteri_adi} için dijital dönüşüm önerisi.`,
    slides: [
      { no: 1, baslik: "Kapak", tip: "kapak", icerik: { ana_baslik: agency_name, alt_baslik: `${musteri_adi} için Dijital Çözümler`, tarih: meeting_date || today } },
      { no: 2, baslik: "Neden Dijital?", tip: "analiz", icerik: { baslik: "Neden Şimdi Dijital Dönüşüm?", noktalar: [`${sektor || "Sektörünüzde"} dijital görünürlük artıyor`, "Müşteriler online arıyor", "Rekabet avantajı için şart"], vurgu: "Doğru zamandayız — birlikte hareket edelim." } },
      { no: 3, baslik: "Hizmetlerimiz", tip: "hizmetler", icerik: { hizmetler: hizmetListesi.map(h => ({ ad: h, aciklama: "Profesyonel yönetim ve sonuç odaklı yaklaşım", sure: "Süreklilik gerektirir" })) } },
      { no: 4, baslik: "Proje Takvimi", tip: "takvim", icerik: { aylar: [
        { ay: "1. Ay", baslik: "Marka Temeli", icerikler: ["Marka analizi", "Strateji planı", "İçerik kalıbı"] },
        { ay: "2. Ay", baslik: "Dijital Varlık", icerikler: ["Profil optimizasyonu", "İlk içerik serisi", "Ölçümleme"] },
        { ay: "3. Ay", baslik: "İçerik & Büyüme", icerikler: ["Düzenli yayın", "Topluluk yönetimi", "Performans raporu"] },
      ] } },
      { no: 5, baslik: "Neden Biz?", tip: "farklilasma", icerik: { noktalar: [
        { baslik: "Yerel Deneyim", aciklama: "Sektörünüzü ve hedef kitlenizi tanıyoruz" },
        { baslik: "Tam Hizmet", aciklama: "İçerikten reklama tek elden çözüm" },
        { baslik: "Sonuç Odaklı", aciklama: "Hedef bazlı çalışıyor, raporluyoruz" },
      ] } },
      { no: 6, baslik: "Sonraki Adımlar", tip: "cta", icerik: { baslik: "Başlayalım mı?", adimlar: ["Bu hafta detayları konuşalım", "Sözleşme ve briefing", "İlk 30 günde sonuç"], iletisim } },
    ],
    proje_takvimi_ozeti: "3 aylık başlangıç paketi: marka temeli, dijital varlık ve ilk büyüme adımları.",
    ikna_argumanlari: ["Yerel pazar deneyimi", "Tam hizmet kapsamı", "Şeffaf raporlama"],
    duz_metin_versiyonu: `Merhaba, ${agency_name} olarak ${musteri_adi} için dijital alanda destek sunmak istiyoruz. ${hizmetListesi.join(", ")} alanlarında profesyonel hizmet veriyoruz. Detayları konuşmak için iletişime geçelim: ${iletisim}`,
  };
}

/**
 * 3. Aşama — Deployer: AgentWorkflowLog'a "deployer" adımı düş.
 * Asıl dosya oluşturma (PDF/PPTX) frontend'te kullanıcı butonuyla yapılır.
 */
export async function logDeployerStep({ workflowId, entityId, slideCount }) {
  await logAgentStep({
    workflowId,
    role: "distributor",
    status: "completed",
    taskType: "presentation_deploy",
    entityId,
    inputData: { slide_count: slideCount },
    outputData: { ready_for_download: true },
    model: "local",
    handoffData: { nextAgent: null },
  });
}

export { newWorkflowId };