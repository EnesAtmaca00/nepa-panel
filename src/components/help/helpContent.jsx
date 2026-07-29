// Merkezi yardım içerikleri - tüm HelpTooltip'ler buradan beslenir
export const HELP_CONTENT = {
  brand_voice: {
    title: "🎙️ Marka Sesi Rehberi",
    short: "Firmanın AI ile konuşma tonu ve dil kuralları",
    description:
      "Marka Sesi Rehberi, yapay zekanın tüm içerikleri üretirken kullanacağı dil kılavuzudur. Firmanın kim olduğunu, nasıl konuştuğunu ve neleri asla söylemeyeceğini tanımlar. Tüm AI ajanlara 'anayasa' görevi görür.",
    benefits: [
      "Tüm platformlarda tutarlı marka dili",
      "AI içeriklerinde insan denetimi azalır",
      "Yeni ekip üyeleri için hızlı dil eğitimi",
    ],
    steps: [
      "Müşteri kartını aç",
      "'Marka Sesi Rehberi' bölümüne git",
      "'AI ile Oluştur' butonuna bas",
      "AI firmanın bilgilerini okuyup rehberi üretir",
      "Ton sıfatlarını, yasaklı kelimeleri incele",
      "Beğenmezsen 'Yenile' ile tekrar üret",
    ],
    tip: "Rehber oluşturulduktan sonra içerik üretimlerinde otomatik olarak kullanılır, ayrıca bir şey yapmanıza gerek yok.",
    warning: "Firma bilgileri (sektör, hedef kitle) ne kadar dolu olursa rehber o kadar isabetli çıkar.",
  },
  clv_score: {
    title: "💰 Müşteri Yaşam Boyu Değeri (CLV)",
    short: "Müşterinin yıllık toplam gelir değeri",
    description:
      "CLV (Customer Lifetime Value), bir müşterinin size yıllık olarak getirdiği tahmini geliri gösterir. Monthly Fee × 12 formülüyle hesaplanır. Hangi müşterilerin öncelikli ilgi ve kaynak gerektirdiğini belirlemenize yardımcı olur.",
    benefits: ["Kaynak dağılımını optimize et", "VIP müşterileri tanımla", "Fiyatlandırma stratejisi geliştir"],
    steps: [
      "Müşteri kartındaki aylık ücreti doldur",
      "CLV otomatik hesaplanır",
      "VIP eşiğini Ayarlar'dan belirle",
      "Eşiği geçen müşterilere 🌟 VIP rozeti verilir",
    ],
    tip: "CLV düşük ama potansiyeli yüksek müşteriler için upsell fırsatlarına odaklan.",
  },
  churn_risk: {
    title: "🚨 Churn Risk Skoru",
    short: "Müşterinin kaybedilme olasılığı (0-100)",
    description:
      "Churn Risk Skoru, bir müşterinin yakın gelecekte hizmetinizi bırakma olasılığını gösterir. Son içerik üretim tarihi, sözleşme bitiş tarihi ve ödeme geçmişi faktörlerine göre hesaplanır.",
    benefits: [
      "Kaybetmeden önce aksiyon al",
      "Win-back kampanyasını zamanında başlat",
      "Müşteri memnuniyetini proaktif yönet",
    ],
    steps: [
      "Skor otomatik güncellenir",
      "0-30: Düşük risk (yeşil)",
      "31-60: Orta risk (sarı) — takip et",
      "61-100: Yüksek risk (kırmızı) — hemen aksiyon al",
      "'Win-Back Kampanyası Başlat' butonunu kullan",
    ],
    warning: "Yüksek riskli müşterileri görmezden gelmek müşteri kaybını 3 kat artırır.",
  },
  content_pillar: {
    title: "🏛️ İçerik Direkleri",
    short: "Eğit / Eğlendir / Sat / Güven — içerik kategorisi",
    description:
      "İçerik Direkleri, sosyal medya stratejisinin temelini oluşturan 4 içerik kategorisidir. Her içerik bu dört kategoriden birine girer. Doğru denge takipçi büyümesi ve satış için kritiktir.",
    benefits: [
      "Marka yorgunluğunu önler",
      "Farklı kitle segmentlerine hitap eder",
      "AI takvim dengeli plan oluşturur",
    ],
    steps: [
      "'Eğit': Sektör bilgisi, ipucu, nasıl yapılır",
      "'Eğlendir': Meme, anket, eğlenceli içerik",
      "'Sat': Ürün/hizmet tanıtımı, kampanya",
      "'Güven': Referans, başarı hikayesi, ekip",
    ],
    tip: "İdeal oran: %40 Eğit, %30 Eğlendir, %20 Güven, %10 Sat. Aylık planlayıcı bunu otomatik dengeler.",
    warning: "Arka arkaya 3 günden fazla 'Sat' içeriği paylaşmak takipçi kaybına yol açar.",
  },
  content_repurpose: {
    title: "🔄 İçerik Uyarlama",
    short: "Bir içeriği farklı platformlar için otomatik uyarla",
    description:
      "İçerik Uyarlama özelliği, hazırladığınız bir içeriği farklı platformların diline ve formatına otomatik çevirir. Aynı konuyu LinkedIn'de profesyonel makale, TikTok'ta hook'lu kısa video metni olarak üretir.",
    benefits: [
      "1 içerikten 4 platform içeriği çıkar",
      "Platform spesifik ton ve format",
      "Zaman tasarrufu %80+",
    ],
    steps: [
      "İçerik Takvimi'nde bir içeriği aç",
      "'🔄 Diğer Platformlara Uyarla' butonuna bas",
      "Uyarlanacak platformları seç",
      "AI her platform için ayrı versiyon üretir",
      "Önizle ve kaydet",
    ],
    tip: "En iyi performans gösteren içerikleri önce repurpose et — zaten kanıtlanmış konular.",
  },
  approval_flow: {
    title: "✅ İçerik Onay Akışı",
    short: "İçerik → İç Onay → Müşteriye Gönder → Müşteri Onayı",
    description:
      "Onay akışı, bir içeriğin üretimden yayınlanmaya kadar geçtiği onay aşamalarını yönetir. İç onay (ekip) ve müşteri onayı (client) olmak üzere iki katmandan oluşur. Her aşama takip edilebilir ve denetlenebilir.",
    benefits: [
      "Hatalı içerik yayınını önler",
      "Müşteri ile şeffaf iletişim",
      "Hukuki ve marka riski azalır",
    ],
    steps: [
      "İçerik üretilince 'İç Onay Bekliyor' durumuna düşer",
      "Ekip '✅ Onayla' butonuna basar",
      "Müşteri onayı gerekiyorsa '📤 Müşteriye Gönder'",
      "Müşteri link üzerinden onaylar/revizyon ister",
      "Onaylanan içerik 'Yayına Hazır' olur",
    ],
    tip: "Ayarlar'dan firma bazında onay modunu değiştirebilirsin: Yok / İç Onay / Müşteri Onayı.",
  },
  monthly_calendar: {
    title: "📅 Aylık İçerik Takvimi",
    short: "AI ile 30 günlük dengeli içerik planı oluştur",
    description:
      "Aylık İçerik Takvimi, seçilen firma için AI'ın otomatik 30 günlük içerik planı oluşturmasını sağlar. İçerik direkleri dengelenerek, platform çeşitliliği korunarak hazırlanır.",
    benefits: [
      "30 dakikada tam ay planı",
      "İçerik direkleri otomatik dengelenir",
      "Toplu takvime aktarma imkânı",
    ],
    steps: [
      "AI Studio > Aylık Plan sekmesine git",
      "Firma ve ay seç",
      "'Plan Oluştur' butonuna bas",
      "AI 30 günlük takvim üretir",
      "Beğendiğin günleri seç",
      "'Takvime Aktar' ile ContentIdea olarak kaydet",
    ],
    tip: "Planı oluşturduktan sonra tek tek düzenleyebilirsin. Tümünü aktarmak zorunda değilsin.",
    warning: "Marka Sesi Rehberi dolu firmalar için çok daha kişiselleştirilmiş plan çıkar.",
  },
  sop_generator: {
    title: "📋 SOP Üreticisi",
    short: "Standart Operasyon Prosedürü — AI ile otomatik belgeleme",
    description:
      "SOP Üreticisi, iş süreçlerinizi yapılandırılmış adım adım dokümanlara dönüştürür. Kimin ne yapacağını, hangi araçları kullanacağını ve istisnai durumlarda ne yapılacağını otomatik belgeler.",
    benefits: [
      "Yeni personel eğitim süresi azalır",
      "Operasyonel tutarlılık artar",
      "Kurumsal hafıza kaybolmaz",
    ],
    steps: [
      "AI Studio > SOP Üreticisi sekmesine git",
      "Süreç başlığı ve özet yaz",
      "Kategori seç (onboarding, içerik, fatura...)",
      "'SOP Oluştur' butonuna bas",
      "Adımları incele, düzenle",
      "PDF olarak indir veya sistemde sakla",
    ],
    tip: "Süreç özetini ne kadar detaylı yazarsan SOP o kadar isabetli çıkar.",
  },
  lead_management: {
    title: "🎯 Lead Yönetimi",
    short: "B2B potansiyel müşteri takibi ve AI ile outreach",
    description:
      "Lead Yönetimi, ajansınızın B2B satış sürecini baştan sona yönetir. Excel'den toplu lead aktarımı, AI ile kişiselleştirilmiş ilk temas mesajı üretimi ve kanban takibi sunar.",
    benefits: [
      "Haftalık 80-130 firmaya verimli ulaşım",
      "Kişiselleştirilmiş AI mesajları ile yüksek açılma oranı",
      "Satış hunisini görsel takip et",
    ],
    steps: [
      "/leads sayfasına git",
      "Excel'den aktar veya manuel ekle",
      "Lead'leri seç → 'AI Mesaj Üret'",
      "AI her firmaya özel mesaj yazar",
      "Onayla ve gönder",
      "Kanban'da ilerlemesini takip et",
    ],
    tip: "Excel şablonunda en az: Şirket Adı, E-posta, Sektör, Ülke kolonları olsun.",
    warning: "AI mesajları otomatik gönderilmez — HITL ayarı aktifse önce onayından geçer.",
  },
  winback_campaign: {
    title: "💌 Win-Back Kampanyası",
    short: "60+ gün pasif müşterileri geri kazanmak için 3 aşamalı mesaj dizisi",
    description:
      "Win-Back, uzun süredir içerik üretilmeyen veya iletişim kesilmiş müşterileri yeniden aktive etmek için AI'ın hazırladığı 3 aşamalı mesaj stratejisidir. Baskıcı değil, samimi ve değer odaklı bir yaklaşım izler.",
    benefits: [
      "Kayıp müşteri maliyeti yeni müşteriden 5x düşük",
      "Kişiselleştirilmiş empati dili",
      "3 aşamalı strateji — satış baskısı yok",
    ],
    steps: [
      "/winback sayfasına git",
      "Pasif firmalar otomatik listelenir",
      "Firma seç → 'Kampanya Başlat'",
      "AI 3 mesaj yazar: hal-hatır / teklif / veda",
      "Her mesajı düzenle ve onayla",
      "Gönderim zamanı gelince bildirim alırsın",
    ],
    tip: "Adım 1 mesajı kesinlikle satış içermemeli — sadece 'Nasılsınız?' tonu.",
  },
  agent_system: {
    title: "🤖 Ajan Sistemi (Multi-Agent)",
    short: "7 uzman AI ajan birlikte çalışarak kaliteli çıktı üretir",
    description:
      "Ajan Sistemi, tek bir büyük AI'a her şeyi yaptırmak yerine, her biri kendi alanında uzmanlaşmış 7 farklı AI ajanının koordineli çalışmasını sağlar. Bu yaklaşım çıktı kalitesini ve tutarlılığını dramatik artırır.",
    benefits: [
      "Tek AI'dan %40+ daha kaliteli çıktı",
      "Her ajan kendi hatalarını denetler",
      "İnsan müdahalesi stratejik noktalarda",
    ],
    steps: [
      "/ajanlar sayfasına git",
      "Her ajanın modelini ayarla (hız vs kalite)",
      "HITL ayarlarını belirle",
      "Muhakeme İzi'nden geçmişi takip et",
    ],
    tip: "Savings Mode aktifse basit görevler ucuz model (gemini-flash), karmaşık görevler güçlü model (claude-sonnet) kullanır.",
  },
  hitl_settings: {
    title: "👤 Human-in-the-Loop (HITL)",
    short: "AI aksiyonları göndermeden önce senin onayını bekler",
    description:
      "HITL (Human-in-the-Loop), yapay zeka ajanlarının kritik aksiyonları otomatik göndermek yerine önce sizin onayınızı almasını sağlar. Bu özellik hem hataları önler hem de EU AI Act 2026 uyumluluğu için önerilir.",
    benefits: [
      "Hatalı AI mesajlarını yayınlanmadan yakala",
      "Marka itibarını koru",
      "Yasal uyumluluk (EU AI Act)",
    ],
    steps: [
      "/ajanlar sayfasına git",
      "'HITL Ayarları' bölümüne git",
      "Onay gerektiren işlemleri seç",
      "Kaydet",
      "O işlem yapıldığında AI bekler, sana bildirim gelir",
      "Onayla veya düzenle",
    ],
    tip: "İlk başta tüm seçenekleri açık tut. Sisteme güven arttıkça kademeli olarak azalt.",
  },
  style_memory: {
    title: "🎨 Stil Hafızası (CTV-CBBE)",
    short: "Firmanın görsel kimliğini AI'ın analiz etmesi ve öğrenmesi",
    description:
      "Stil Hafızası, firmanın yüklenen görsel materyallerini AI'ın analiz ederek renk paleti, kompozisyon tarzı ve marka kimliğini öğrenmesini sağlar. Bu hafıza sonraki tüm görsel prompt üretimlerinde kullanılır.",
    benefits: [
      "Görsel tutarlılık otomatik korunur",
      "Her prompt marka renklerine uygun üretilir",
      "Estetik puan ile kalite takibi",
    ],
    steps: [
      "Müşteri Dosyaları'na logo, tasarım örnekleri yükle",
      "Müşteri kartı > 'Görsel Kimlik Analizi' bölümüne git",
      "'Yeniden Analiz Et' butonuna bas",
      "AI renk, kompozisyon, semboller tespit eder",
      "Görsel prompt üretiminde otomatik kullanılır",
    ],
    tip: "En az 5-10 örnek görsel yüklemek analiz kalitesini önemli ölçüde artırır.",
  },
  savings_mode: {
    title: "💚 Tasarruf Modu",
    short: "Basit görevler ucuz model, karmaşık görevler güçlü model kullanır",
    description:
      "Tasarruf Modu aktifken sistem, her göreve uygun modeli otomatik seçer. Hashtag veya kısa caption gibi basit işler için ucuz/hızlı model, strateji veya SOP gibi karmaşık işler için güçlü model kullanır.",
    benefits: [
      "AI maliyetini %60-70 azaltır",
      "Kalite kompromis yapmadan tasarruf",
      "Aylık AI bütçe takibi",
    ],
    steps: [
      "Ayarlar > AI Ayarları bölümüne git",
      "'Tasarruf Modu' toggle'ını aç",
      "Aylık AI bütçe limitini belirle",
      "Model Routing tablosundan her görev için model ata",
      "Dashboard'dan kullanımı takip et",
    ],
    tip: "caption_translate, hashtag ve content_idea görevleri için gemini-flash idealdir. Web mimarisi ve SOP için claude-sonnet kullan.",
  },
  web_architect: {
    title: "🌐 Web Sitesi Mimari Asistanı",
    short: "AI ile web sitesi planı, içerik haritası ve geliştirici promptu üret",
    description:
      "Web Mimari Asistanı, seçtiğiniz firma için sektöre özel web sitesi mimarisi oluşturur. Her sayfa için içerik önerileri, taslak metinler üretir ve seçtiğiniz AI aracının (Base44, Bolt, Cursor vb.) anlayacağı geliştirici promptu hazırlar.",
    benefits: [
      "Sıfırdan web planı 5 dakikada",
      "Sayfa bazında içerik ve metin önerileri",
      "Seçilen AI araca özel prompt ile direk kullan",
    ],
    steps: [
      "Web Projeleri > 'Yeni Web Sitesi Oluştur'",
      "Firmayı seç (bilgiler otomatik dolar)",
      "Özellikler, sayfa sayısı, referans linkleri gir",
      "AI aracını seç (Base44, Bolt, Cursor...)",
      "'Analiz Et & Mimari Oluştur' butonuna bas",
      "Mimari Tab: sayfa planını incele",
      "Prompt Tab: kopyala, seçilen araca yapıştır",
    ],
    tip: "Referans site linkleri ne kadar çok olursa AI o kadar iyi yönlendirme yapabilir.",
    warning: "Prompt üretildikten sonra yapay zeka aracına göre küçük manuel düzenlemeler gerekebilir.",
  },
  invoice_overdue: {
    title: "💸 Vadesi Geçmiş Fatura",
    short: "Due date geçen bekleyen faturalar otomatik overdue işaretlenir",
    description:
      "Sistem, her faturalar sayfası açıldığında vadesi geçmiş bekleyen faturaları otomatik olarak 'Vadesi Geçmiş' durumuna alır ve size bildirim gönderir. Manuel takip gerekmez.",
    benefits: [
      "Hiçbir overdue fatura gözden kaçmaz",
      "Otomatik bildirim ile proaktif tahsilat",
      "Finans raporlaması netleşir",
    ],
    steps: [
      "Faturalar sayfasını aç (otomatik kontrol başlar)",
      "Kırmızı satırlar vadesi geçmiş faturalardır",
      "Sarı '🔔 X gün kaldı' badge'i yaklaşan vadeleri gösterir",
      "Fatura üzerine tıkla → müşteriyle iletişime geç",
      "Ödeme alınınca 'Ödendi' olarak işaretle",
    ],
    tip: "Fatura oluştururken due_date'i mutlaka doldur — boş due_date olan faturalar kontrol edilemez.",
  },
  reasoning_log: {
    title: "📋 Muhakeme İzi (Reasoning Log)",
    short: "Her AI kararının neden ve nasıl alındığının kayıt altına alınması",
    description:
      "Muhakeme İzi, her AI ajanının hangi kararı neden aldığını, hangi veriye bakarak ne sonuca ulaştığını kayıt altında tutar. Bu özellik hem hata ayıklama için hem de yasal denetlenebilirlik için kritiktir.",
    benefits: [
      "AI hatalarını tespit et ve düzelt",
      "Yasal uyumluluk (KVKK/GDPR denetimi)",
      "Hangi kararın hangi aşamada alındığını gör",
    ],
    steps: [
      "/ajanlar sayfasına git",
      "'Muhakeme İzi' bölümüne scroll et",
      "Her log satırı: ajan, görev, karar, güven skoru",
      "Satıra tıkla: giriş verisi, çıktı, el değiştirme datası",
      "HITL bekleyen loglar turuncu vurguyla gösterilir",
    ],
    tip: "Güven skoru 0.7 altındaki kararlar için manuel inceleme önerilir.",
  },
  multi_tenant: {
    title: "🏢 Çoklu Müşteri Yalıtımı",
    short: "Her müşterinin verisi birbirinden tamamen izole tutulur",
    description:
      "Sistem, her ajans müşterisinin verilerini birbirinden güvenli biçimde izole eder. Basic plan müşteriler paylaşımlı şemada Row-Level Security ile, Enterprise müşteriler ise ayrı veritabanı modelinde yönetilir.",
    benefits: [
      "Veri güvenliği: A firması B firmasının verisini göremez",
      "KVKK/GDPR uyumlu mimari",
      "Performans yalıtımı",
    ],
    steps: [
      "Her firma otomatik izole edilir (manuel bir işlem yok)",
      "Firma kartındaki 'Plan' alanı yalıtım seviyesini belirler",
      "Enterprise plan: tam veritabanı yalıtımı",
      "Basic/Professional: satır bazlı güvenlik",
    ],
    tip: "Enterprise plan gerektiren firmalar için bize ulaşın — özel veritabanı kurulumu yapılır.",
  },
  competitor_analysis: {
    title: "🔍 Rakip Analizi",
    short: "Rakiplerin sosyal medya performansını analiz et, fırsat bul",
    description:
      "Rakip Analizi modülü, müşterinizin rakiplerinin sosyal medya hesaplarını analiz ederek paylaşım sıklığı, en çok kullandıkları hashtag'ler ve içerik tiplerini ortaya çıkarır. Bu verilerden içerik stratejisi fırsatları üretilir.",
    benefits: [
      "Rakiplerin zayıf noktalarını tespit et",
      "Boş kalmış içerik alanlarını keşfet",
      "Rakipten daha iyi zamanlama ile paylaşım yap",
    ],
    steps: [
      "Müşteri kartı > Rakipler bölümüne git",
      "Rakip sosyal medya handle'larını ekle (@hesap)",
      "Raporlar > 'Rakip Raporu Oluştur'",
      "Analiz tamamlanınca fırsatlar listelenir",
      "İçerik fikirlerine doğrudan aktar",
    ],
  },
  phone_calls: {
    title: "📞 Otonom Telefon Görüşmeleri",
    short: "AI ajanı müşterilerle telefon görüşmesi yapabilir",
    description:
      "Twilio entegrasyonu sayesinde AI ajanı, firmanıza atanmış telefon numarası üzerinden müşterilerle konuşabilir. Konuşma transkript'e dönüştürülür, duygu analizi yapılır ve gerektiğinde insan temsilciye aktarılır.",
    benefits: [
      "7/24 müşteri iletişimi",
      "Her görüşme transkript ve özetle kaydedilir",
      "Düşük güven skorunda otomatik insan devri",
    ],
    steps: [
      "Ayarlar > Twilio entegrasyonunu kur",
      "Firmaya telefon numarası ata",
      "Çağrı geldiğinde AI otomatik cevaplar",
      "/phone-calls sayfasından tüm görüşmeleri izle",
      "Transkript ve duygu analizi her çağrıda hazır",
    ],
    warning: "Güven skoru 0.6 altına düşerse çağrı otomatik insan temsilciye aktarılır.",
  },
};