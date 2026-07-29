// AjansPro — Hizmet Kataloğu, Özel Günler ve Tekrarlayan İçerik şablonları için seed
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SEED_SERVICES = [
  { name: "Sosyal Medya Yönetimi", billing_type: "monthly", icon: "Share2", default_price_try: 15000, default_price_eur: 500 },
  { name: "Logo Tasarım", billing_type: "one_time", icon: "Palette", default_price_try: 8000, default_price_eur: 250 },
  { name: "Web Sitesi", billing_type: "one_time", icon: "Globe", default_price_try: 35000, default_price_eur: 1200 },
  { name: "WP İçerik Paylaşımı", billing_type: "monthly", icon: "MessageSquare", default_price_try: 5000, default_price_eur: 150 },
  { name: "Antetli Kağıt", billing_type: "one_time", icon: "FileText", default_price_try: 2500, default_price_eur: 80 },
  { name: "Mail İmza", billing_type: "one_time", icon: "Mail", default_price_try: 1500, default_price_eur: 50 },
  { name: "Reklam Çekimi", billing_type: "monthly", icon: "Camera", default_price_try: 12000, default_price_eur: 400 },
  { name: "Marka Kimliği", billing_type: "one_time", icon: "Sparkles", default_price_try: 18000, default_price_eur: 600 },
  { name: "Mockup Tasarım", billing_type: "one_time", icon: "Image", default_price_try: 3500, default_price_eur: 120 },
  { name: "Banner Reklam", billing_type: "monthly", icon: "Megaphone", default_price_try: 7000, default_price_eur: 220 },
];

const SEED_RECURRING_TEMPLATES = [
  { name: "Hayırlı Cumalar", frequency: "weekly", day_of_week: 5, emoji: "🕌", design_brief_template: "Cuma günü için sakin, manevi atmosferli post. Marka kimliğine uygun renkler, minimal tipografi.", caption_template: "Hayırlı Cumalar 🌿", visual_style_notes: "Soft tonlar, gold aksanlar", reminder_days_before: 2 },
  { name: "Mutlu Pazartesiler", frequency: "weekly", day_of_week: 1, emoji: "☀️", design_brief_template: "Haftaya enerjik başlangıç postu. Motivasyon dolu.", caption_template: "Yeni bir hafta, yeni bir başlangıç ✨", visual_style_notes: "Canlı renkler", reminder_days_before: 2 },
  { name: "Hafta Sonu Motivasyon", frequency: "weekly", day_of_week: 6, emoji: "🎉", design_brief_template: "Hafta sonu için rahatlatıcı, eğlenceli post.", caption_template: "Hafta sonu keyfi başlasın 🌅", visual_style_notes: "Sıcak tonlar", reminder_days_before: 2 },
  { name: "Ay Başı Hoş Geldin", frequency: "monthly", day_of_month: 1, emoji: "📅", design_brief_template: "Yeni ayı karşılayan post.", caption_template: "Yeni bir ay, yeni fırsatlar 🌟", visual_style_notes: "Takvim, hedef ikonları", reminder_days_before: 2 },
];

const SEED_SPECIAL_DAYS = [
  { name: "Yılbaşı", date_rule_type: "fixed", fixed_date: "01-01", type: "national_holiday", countries: ["TR", "BE", "GLOBAL"], emoji: "🎉" },
  { name: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", date_rule_type: "fixed", fixed_date: "04-23", type: "national_holiday", countries: ["TR"], emoji: "🇹🇷" },
  { name: "1 Mayıs Emek ve Dayanışma Günü", date_rule_type: "fixed", fixed_date: "05-01", type: "national_holiday", countries: ["TR", "BE"], emoji: "✊" },
  { name: "19 Mayıs Atatürk'ü Anma Gençlik ve Spor Bayramı", date_rule_type: "fixed", fixed_date: "05-19", type: "national_holiday", countries: ["TR"], emoji: "🇹🇷" },
  { name: "15 Temmuz Demokrasi ve Milli Birlik Günü", date_rule_type: "fixed", fixed_date: "07-15", type: "national_holiday", countries: ["TR"], emoji: "🇹🇷" },
  { name: "30 Ağustos Zafer Bayramı", date_rule_type: "fixed", fixed_date: "08-30", type: "national_holiday", countries: ["TR"], emoji: "🇹🇷" },
  { name: "29 Ekim Cumhuriyet Bayramı", date_rule_type: "fixed", fixed_date: "10-29", type: "national_holiday", countries: ["TR"], emoji: "🇹🇷" },
  { name: "10 Kasım Atatürk'ü Anma Günü", date_rule_type: "fixed", fixed_date: "11-10", type: "national_holiday", countries: ["TR"], emoji: "🕯️" },
  { name: "Sevgililer Günü", date_rule_type: "fixed", fixed_date: "02-14", type: "international", countries: ["TR", "BE", "GLOBAL"], emoji: "❤️", relevant_sectors: ["Restoran & Cafe", "Moda & Tekstil", "Güzellik & Kozmetik"] },
  { name: "Dünya Kadınlar Günü", date_rule_type: "fixed", fixed_date: "03-08", type: "international", countries: ["TR", "BE", "GLOBAL"], emoji: "💐" },
  { name: "Tıp Bayramı", date_rule_type: "fixed", fixed_date: "03-14", type: "sectoral", countries: ["TR"], emoji: "⚕️", relevant_sectors: ["Sağlık & Klinik"] },
  { name: "Çanakkale Şehitlerini Anma Günü", date_rule_type: "fixed", fixed_date: "03-18", type: "national_holiday", countries: ["TR"], emoji: "🕯️" },
  { name: "Anneler Günü", date_rule_type: "dynamic", dynamic_rule: "anneler_gunu", type: "international", countries: ["TR", "BE", "GLOBAL"], emoji: "👩‍👧" },
  { name: "Babalar Günü", date_rule_type: "dynamic", dynamic_rule: "babalar_gunu", type: "international", countries: ["TR", "BE", "GLOBAL"], emoji: "👨‍👦" },
  { name: "Öğretmenler Günü", date_rule_type: "fixed", fixed_date: "11-24", type: "national_holiday", countries: ["TR"], emoji: "📚", relevant_sectors: ["Eğitim"] },
  { name: "Belçika Ulusal Bayramı", date_rule_type: "fixed", fixed_date: "07-21", type: "national_holiday", countries: ["BE"], emoji: "🇧🇪" },
  { name: "Onze-Lieve-Vrouw-Hemelvaart / Assomption", date_rule_type: "fixed", fixed_date: "08-15", type: "religious", countries: ["BE"], emoji: "✝️" },
  { name: "Allerheiligen / Toussaint", date_rule_type: "fixed", fixed_date: "11-01", type: "religious", countries: ["BE"], emoji: "🕯️" },
  { name: "Wapenstilstand / Armistice", date_rule_type: "fixed", fixed_date: "11-11", type: "national_holiday", countries: ["BE"], emoji: "🌹" },
  { name: "Kerstmis / Noël", date_rule_type: "fixed", fixed_date: "12-25", type: "religious", countries: ["TR", "BE", "GLOBAL"], emoji: "🎄" },
  { name: "Koningsdag / Fête du Roi", date_rule_type: "fixed", fixed_date: "11-15", type: "national_holiday", countries: ["BE"], emoji: "👑" },
  { name: "Sinterklaas", date_rule_type: "fixed", fixed_date: "12-06", type: "religious", countries: ["BE"], emoji: "🎁" },
  { name: "Pi Günü", date_rule_type: "fixed", fixed_date: "03-14", type: "international", countries: ["GLOBAL"], emoji: "🥧", relevant_sectors: ["Eğitim", "Teknoloji"] },
  { name: "Dünya Sağlık Günü", date_rule_type: "fixed", fixed_date: "04-07", type: "sectoral", countries: ["GLOBAL"], emoji: "🏥", relevant_sectors: ["Sağlık & Klinik", "Spor & Fitness"] },
  { name: "Earth Day", date_rule_type: "fixed", fixed_date: "04-22", type: "international", countries: ["GLOBAL"], emoji: "🌍" },
  { name: "Dünya Kitap Günü", date_rule_type: "fixed", fixed_date: "04-23", type: "international", countries: ["GLOBAL"], emoji: "📖", relevant_sectors: ["Eğitim"] },
  { name: "Dünya Çevre Günü", date_rule_type: "fixed", fixed_date: "06-05", type: "international", countries: ["GLOBAL"], emoji: "🌱" },
  { name: "Dünya Çikolata Günü", date_rule_type: "fixed", fixed_date: "07-07", type: "sectoral", countries: ["GLOBAL"], emoji: "🍫", relevant_sectors: ["Restoran & Cafe", "E-ticaret"] },
  { name: "Dünya Kahve Günü", date_rule_type: "fixed", fixed_date: "10-01", type: "sectoral", countries: ["GLOBAL"], emoji: "☕", relevant_sectors: ["Restoran & Cafe"] },
  { name: "Dünya Gıda Günü", date_rule_type: "fixed", fixed_date: "10-16", type: "international", countries: ["GLOBAL"], emoji: "🍽️", relevant_sectors: ["Restoran & Cafe"] },
  { name: "Halloween", date_rule_type: "fixed", fixed_date: "10-31", type: "international", countries: ["BE", "GLOBAL"], emoji: "🎃" },
  { name: "Black Friday", date_rule_type: "dynamic", dynamic_rule: "black_friday", type: "international", countries: ["TR", "BE", "GLOBAL"], emoji: "🛍️", relevant_sectors: ["E-ticaret", "Moda & Tekstil"] },
  { name: "Cyber Monday", date_rule_type: "dynamic", dynamic_rule: "cyber_monday", type: "international", countries: ["TR", "BE", "GLOBAL"], emoji: "💻", relevant_sectors: ["E-ticaret", "Teknoloji"] },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const result = { services: 0, special_days: 0, recurring_templates: 0 };

    // Hizmetler
    const existingServices = await base44.entities.ServiceCatalog.list();
    if (existingServices.length === 0) {
      for (const svc of SEED_SERVICES) {
        await base44.entities.ServiceCatalog.create(svc);
      }
      result.services = SEED_SERVICES.length;
    }

    // Özel Günler
    const existingDays = await base44.entities.SpecialDay.list();
    if (existingDays.length === 0) {
      for (const day of SEED_SPECIAL_DAYS) {
        await base44.entities.SpecialDay.create(day);
      }
      result.special_days = SEED_SPECIAL_DAYS.length;
    }

    // Tekrarlayan Şablonlar
    const existingTemplates = await base44.entities.RecurringContentTemplate.list();
    if (existingTemplates.length === 0) {
      for (const tpl of SEED_RECURRING_TEMPLATES) {
        await base44.entities.RecurringContentTemplate.create(tpl);
      }
      result.recurring_templates = SEED_RECURRING_TEMPLATES.length;
    }

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("seedAppData error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});