// ============================================================
// Yasal sayfalar — Gizlilik, Kullanım Koşulları, Veri Silme
//
// NEDEN GEREKLİ: Meta App Review bu üç adresi ZORUNLU tutuyor ve
// inceleyici onlara OTURUM AÇMADAN giriyor. Bu yüzden bu rotalar
// kimlik doğrulamasının dışında, App.jsx'te hem girişli hem girişsiz
// blokta tanımlı.
//
// facebook.com gibi başka bir siteyi göstermek kabul edilmiyor —
// kendi alan adında gerçek içerik istiyorlar.
//
// TikTok, LinkedIn ve X de aynı üç adresi istiyor.
//
// ⚠️ Bu metinler hukuk danışmanlığı değil. Meta'nın teknik
// gereksinimlerini karşılayacak ve uygulamanın gerçekte ne yaptığını
// doğru anlatacak şekilde yazıldı. Yayına almadan önce bir avukata
// okutman iyi olur; özellikle KVKK ve GDPR ifadelerini.
// ============================================================
import React from "react";
import { Link, useLocation } from "react-router-dom";

const AJANS = {
  ad: "Ne-Pa Yazılım & Grafik",
  eposta: "enesa4276@gmail.com",
  panel: "https://nepa-panel.vercel.app",
};

const GUNCELLEME = "2 Ağustos 2026";

function Sayfa({ baslik, children }) {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10 pb-6 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-500">{AJANS.ad}</p>
          <h1 className="text-3xl font-bold mt-1">{baslik}</h1>
          <p className="text-sm text-slate-500 mt-2">
            Son güncelleme: {GUNCELLEME}
          </p>
        </header>

        <article className="prose-nepa space-y-6 leading-relaxed">{children}</article>

        <footer className="mt-14 pt-6 border-t border-slate-200 text-sm text-slate-500">
          <nav className="flex flex-wrap gap-4 mb-4">
            <Link to="/gizlilik" className="hover:underline">Gizlilik Politikası</Link>
            <Link to="/kullanim-kosullari" className="hover:underline">Kullanım Koşulları</Link>
            <Link to="/veri-silme" className="hover:underline">Veri Silme</Link>
          </nav>
          <p>
            İletişim: <a href={`mailto:${AJANS.eposta}`} className="underline">{AJANS.eposta}</a>
          </p>
        </footer>
      </div>

      <style>{`
        .prose-nepa h2 { font-size: 1.15rem; font-weight: 600; margin-top: 2rem; margin-bottom: .5rem; }
        .prose-nepa h3 { font-size: 1rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: .35rem; }
        .prose-nepa p  { margin-bottom: .75rem; }
        .prose-nepa ul { list-style: disc; padding-left: 1.4rem; margin-bottom: .75rem; }
        .prose-nepa li { margin-bottom: .35rem; }
        .prose-nepa table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .9rem; }
        .prose-nepa th, .prose-nepa td { border: 1px solid #e2e8f0; padding: .5rem .65rem; text-align: left; vertical-align: top; }
        .prose-nepa th { background: #f8fafc; font-weight: 600; }
      `}</style>
    </div>
  );
}

/* ══════════════════ GİZLİLİK ══════════════════ */

export function Gizlilik() {
  return (
    <Sayfa baslik="Gizlilik Politikası">
      <p>
        {AJANS.ad} ("biz"), Ne-Pa Panel adlı ajans yönetim uygulamasını
        işletmektedir. Bu politika, uygulamayı kullandığınızda hangi
        verileri işlediğimizi, neden işlediğimizi ve bunları nasıl
        koruduğumuzu açıklar.
      </p>
      <p>
        <strong>Ne-Pa Panel halka açık bir hizmet değildir.</strong> Yalnızca
        {" "}{AJANS.ad} çalışanları ve yetkilendirilmiş müşteri temsilcileri
        tarafından, ajansın kendi iş süreçlerini yürütmek için kullanılır.
      </p>

      <h2>1. İşlediğimiz veriler</h2>

      <h3>Hesap bilgileri</h3>
      <ul>
        <li>Ad soyad, e-posta adresi ve uygulama içi rol bilgisi</li>
        <li>Oturum açma kayıtları</li>
      </ul>

      <h3>Müşteri ve iş verileri</h3>
      <ul>
        <li>Ajans müşterilerine ait firma bilgileri, marka notları ve iletişim bilgileri</li>
        <li>İçerik planları, görseller, metinler ve yayın takvimleri</li>
        <li>Fatura, sözleşme ve gider kayıtları</li>
      </ul>

      <h3>Bağladığınız hesaplardan gelen veriler</h3>
      <p>
        Uygulama, sizin açık onayınızla aşağıdaki hizmetlere bağlanabilir.
        Bağlantıyı siz başlatırsınız ve dilediğiniz an kesebilirsiniz.
      </p>

      <table>
        <thead>
          <tr><th>Hizmet</th><th>Eriştiğimiz veri</th><th>Kullanım amacı</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Instagram (Business)</td>
            <td>Hesap kimliği ve kullanıcı adı; içerik yayınlama yetkisi</td>
            <td>Planladığınız gönderileri belirlediğiniz saatte yayınlamak</td>
          </tr>
          <tr>
            <td>Facebook Sayfaları</td>
            <td>Yönettiğiniz sayfaların listesi ve sayfa erişim yetkisi</td>
            <td>Sayfaya gönderi yayınlamak</td>
          </tr>
          <tr>
            <td>LinkedIn</td>
            <td>Ad, e-posta, profil kimliği; paylaşım yetkisi</td>
            <td>Profil veya sayfada gönderi paylaşmak</td>
          </tr>
          <tr>
            <td>TikTok</td>
            <td>Temel hesap bilgisi; video yükleme yetkisi</td>
            <td>Video içeriği yüklemek</td>
          </tr>
          <tr>
            <td>X (Twitter)</td>
            <td>Kullanıcı adı ve kimlik; gönderi paylaşma yetkisi</td>
            <td>Gönderi paylaşmak</td>
          </tr>
          <tr>
            <td>Google Drive</td>
            <td><em>Yalnızca</em> uygulamanın oluşturduğu klasör ve dosyalar</td>
            <td>Müşteri klasörlerini düzenlemek, tasarım dosyalarını saklamak</td>
          </tr>
          <tr>
            <td>Gmail</td>
            <td>Gelen kutusu okuma; taslak oluşturma</td>
            <td>Önemli e-postaları özetlemek, yanıt taslağı hazırlamak</td>
          </tr>
        </tbody>
      </table>

      <p>
        <strong>Yapmadıklarımız:</strong> Gmail üzerinden sizin adınıza
        e-posta göndermiyoruz — yalnızca taslak bırakıyoruz, gönderme
        kararı sizde. Google Drive'da yalnızca uygulamanın kendi
        oluşturduğu dosyalara erişiyoruz; diğer dosyalarınızı göremiyoruz.
      </p>

      <h2>2. Verileri nasıl saklıyoruz</h2>
      <ul>
        <li>
          Veriler Supabase altyapısında, Avrupa Birliği (İrlanda)
          bölgesindeki sunucularda saklanır.
        </li>
        <li>
          Bağlı hesapların erişim anahtarları <strong>şifrelenmiş bir
          kasada</strong> tutulur. Veritabanı tablolarında açık metin
          olarak bulunmaz ve tarayıcıya hiçbir zaman gönderilmez.
        </li>
        <li>
          Her kullanıcı yalnızca yetkili olduğu müşterilerin verilerini
          görebilir. Bu kısıt uygulama arayüzünde değil, veritabanı
          düzeyinde uygulanır.
        </li>
        <li>Tüm bağlantılar HTTPS üzerinden şifrelenir.</li>
      </ul>

      <h2>3. Üçüncü taraflarla paylaşım</h2>
      <p>
        Verilerinizi satmıyoruz, kiralamıyoruz ve reklam amacıyla
        paylaşmıyoruz. Veriler yalnızca hizmetin çalışması için gerekli
        altyapı sağlayıcılarına aktarılır:
      </p>
      <ul>
        <li><strong>Supabase</strong> — veritabanı ve dosya depolama</li>
        <li><strong>Vercel</strong> — uygulama barındırma</li>
        <li>
          <strong>Yapay zekâ sağlayıcıları</strong> (OpenRouter, Google,
          OpenAI, Anthropic) — yalnızca içerik üretmek için gönderdiğiniz
          metin ve görseller. Bu isteklere hesap bilgileriniz veya
          erişim anahtarlarınız dahil edilmez.
        </li>
        <li>
          <strong>Bağladığınız sosyal medya platformları</strong> — yalnızca
          yayınlamayı seçtiğiniz içerik.
        </li>
      </ul>

      <h2>4. Saklama süresi</h2>
      <p>
        İş verileri, ajans ile müşteri arasındaki ilişki sürdüğü ve yasal
        saklama yükümlülükleri gerektirdiği sürece tutulur. Bağlı hesap
        anahtarları, bağlantıyı kestiğiniz anda kasadan kalıcı olarak
        silinir.
      </p>

      <h2>5. Haklarınız</h2>
      <p>
        6698 sayılı KVKK ve AB Genel Veri Koruma Tüzüğü (GDPR) kapsamında;
        verilerinize erişme, düzeltilmesini isteme, silinmesini talep etme,
        işlenmesine itiraz etme ve verilerinizin bir kopyasını alma
        haklarına sahipsiniz.
      </p>
      <p>
        Talepleriniz için{" "}
        <a href={`mailto:${AJANS.eposta}`} className="underline">{AJANS.eposta}</a>{" "}
        adresine yazabilirsiniz. Talepleri en geç 30 gün içinde yanıtlarız.
        Silme işlemi için <Link to="/veri-silme" className="underline">Veri Silme</Link>{" "}
        sayfasına da bakabilirsiniz.
      </p>

      <h2>6. Çerezler</h2>
      <p>
        Yalnızca oturumunuzu açık tutmak için gereken teknik çerezleri
        kullanıyoruz. Reklam veya takip çerezi kullanmıyoruz, üçüncü taraf
        analiz aracı çalıştırmıyoruz.
      </p>

      <h2>7. Değişiklikler</h2>
      <p>
        Bu politikayı güncellediğimizde sayfanın üst kısmındaki tarih
        değişir. Önemli değişiklikleri kullanıcılara e-posta ile bildiririz.
      </p>
    </Sayfa>
  );
}

/* ══════════════════ KULLANIM KOŞULLARI ══════════════════ */

export function KullanimKosullari() {
  return (
    <Sayfa baslik="Kullanım Koşulları">
      <p>
        Bu koşullar, {AJANS.ad} tarafından işletilen Ne-Pa Panel
        uygulamasının kullanımını düzenler. Uygulamayı kullanarak bu
        koşulları kabul etmiş olursunuz.
      </p>

      <h2>1. Hizmetin kapsamı</h2>
      <p>
        Ne-Pa Panel, bir dijital ajansın müşteri yönetimi, içerik planlama,
        sosyal medya yayını, faturalama ve raporlama süreçlerini yürüttüğü
        bir iç yönetim aracıdır.
      </p>
      <p>
        <strong>Halka açık bir hizmet değildir.</strong> Erişim yalnızca
        {" "}{AJANS.ad} tarafından oluşturulan hesaplarla mümkündür.
        Kendi kendine kayıt olma imkânı yoktur.
      </p>

      <h2>2. Hesap sorumluluğu</h2>
      <ul>
        <li>Hesap bilgilerinizin gizliliğinden siz sorumlusunuz.</li>
        <li>Hesabınızı başkasıyla paylaşamazsınız.</li>
        <li>Yetkisiz bir erişim fark ederseniz derhal bize bildirin.</li>
      </ul>

      <h2>3. Kabul edilebilir kullanım</h2>
      <p>Uygulamayı kullanırken şunları yapmamayı kabul edersiniz:</p>
      <ul>
        <li>Yürürlükteki mevzuata aykırı içerik üretmek veya yayınlamak</li>
        <li>Başkalarının fikrî mülkiyet haklarını ihlal eden içerik paylaşmak</li>
        <li>Yanıltıcı, aldatıcı veya spam niteliğinde içerik yayınlamak</li>
        <li>Bağlı platformların kendi kullanım koşullarını ihlal etmek</li>
        <li>Sistemin güvenliğini tehlikeye atacak girişimlerde bulunmak</li>
        <li>Yetkiniz olmayan müşteri verilerine erişmeye çalışmak</li>
      </ul>

      <h2>4. Bağlı hesaplar</h2>
      <p>
        Bir sosyal medya hesabını bağladığınızda, uygulamaya o hesap adına
        içerik yayınlama yetkisi vermiş olursunuz. Bağlamadan önce ilgili
        hesabın sahibi olduğunuzdan ya da hesap sahibinden açık izin
        aldığınızdan emin olmalısınız.
      </p>
      <p>
        Yayınlanan içeriğin sorumluluğu içeriği planlayan kullanıcıya
        aittir. Bağlantıyı istediğiniz an kesebilirsiniz.
      </p>

      <h2>5. Yapay zekâ ile üretilen içerik</h2>
      <p>
        Uygulama, içerik fikri, metin ve görsel yönergesi üretmek için
        yapay zekâ modelleri kullanır. Bu çıktılar <strong>öneri
        niteliğindedir</strong>; doğruluğu, özgünlüğü ve yayına
        uygunluğu garanti edilmez.
      </p>
      <p>
        Yayınlanmadan önce içeriği kontrol etmek kullanıcının
        sorumluluğundadır.
      </p>

      <h2>6. Fikrî mülkiyet</h2>
      <p>
        Uygulamanın yazılımı ve tasarımı {AJANS.ad}'a aittir. Uygulamaya
        yüklediğiniz içerikler ise size veya müşterinize ait kalır;
        bunlar üzerinde bir hak talep etmeyiz.
      </p>

      <h2>7. Hizmet sürekliliği</h2>
      <p>
        Hizmetin kesintisiz çalışacağını taahhüt etmiyoruz. Bakım,
        güncelleme veya altyapı sağlayıcılarından kaynaklanan kesintiler
        yaşanabilir. Hizmeti önceden bildirimde bulunarak
        değiştirebilir veya durdurabiliriz.
      </p>

      <h2>8. Sorumluluğun sınırı</h2>
      <p>
        Uygulama "olduğu gibi" sunulur. Yürürlükteki mevzuatın izin verdiği
        ölçüde; veri kaybı, kâr kaybı, itibar zararı veya dolaylı zararlar
        bakımından sorumluluk kabul edilmez. Bu sınırlama, kasıt veya ağır
        ihmalden doğan sorumluluğu kapsamaz.
      </p>

      <h2>9. Fesih</h2>
      <p>
        Bu koşulları ihlal eden hesapları askıya alma veya kapatma hakkımızı
        saklı tutarız. Kullanıcılar da hesaplarının kapatılmasını her zaman
        talep edebilir.
      </p>

      <h2>10. Uygulanacak hukuk</h2>
      <p>
        Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda
        Türkiye mahkemeleri ve icra daireleri yetkilidir.
      </p>

      <h2>11. İletişim</h2>
      <p>
        Sorularınız için:{" "}
        <a href={`mailto:${AJANS.eposta}`} className="underline">{AJANS.eposta}</a>
      </p>
    </Sayfa>
  );
}

/* ══════════════════ VERİ SİLME ══════════════════ */

export function VeriSilme() {
  return (
    <Sayfa baslik="Veri Silme Talimatları">
      <p>
        Ne-Pa Panel'de tuttuğumuz verilerinizin silinmesini her zaman talep
        edebilirsiniz. Aşağıda hangi yolun size uygun olduğunu bulun.
      </p>

      <h2>1. Bağlı bir hesabı kaldırmak</h2>
      <p>
        Sosyal medya, Google Drive veya Gmail bağlantısını kesmek için
        uygulamaya girip ilgili bölümdeki <strong>Bağlantıyı Kes</strong>{" "}
        düğmesine basmanız yeterlidir:
      </p>
      <ul>
        <li>Sosyal medya hesapları: <em>Sosyal Medya</em> sayfası</li>
        <li>Google Drive ve Gmail: <em>Ayarlar &gt; AI &amp; API</em></li>
      </ul>
      <p>
        Bağlantıyı kestiğinizde o hesaba ait erişim anahtarları{" "}
        <strong>anında ve kalıcı olarak</strong> silinir. Bu işlem geri
        alınamaz ve hesabınızın kendisine dokunmaz.
      </p>

      <h2>2. Tüm verilerinizin silinmesini istemek</h2>
      <p>
        Hesabınızın ve size ait tüm verilerin silinmesi için{" "}
        <a href={`mailto:${AJANS.eposta}?subject=Veri%20Silme%20Talebi`} className="underline">
          {AJANS.eposta}
        </a>{" "}
        adresine e-posta gönderin. Konu satırına{" "}
        <strong>"Veri Silme Talebi"</strong> yazın ve mesajınızda şunları belirtin:
      </p>
      <ul>
        <li>Uygulamada kayıtlı e-posta adresiniz</li>
        <li>Silinmesini istediğiniz veriler (tümü ya da belirli kayıtlar)</li>
      </ul>

      <h3>Süreç</h3>
      <ul>
        <li>Talebinizi <strong>3 iş günü</strong> içinde teyit ederiz.</li>
        <li>Silme işlemi <strong>30 gün</strong> içinde tamamlanır.</li>
        <li>Tamamlandığında size yazılı olarak bildiririz.</li>
      </ul>

      <h2>3. Silinemeyen veriler</h2>
      <p>
        Bazı kayıtları yasal yükümlülükler nedeniyle silemeyiz:
      </p>
      <ul>
        <li>
          Fatura ve muhasebe kayıtları — Vergi Usul Kanunu uyarınca
          <strong> 5 yıl</strong> saklanması zorunludur.
        </li>
        <li>
          Sözleşmeler — ilgili zamanaşımı süresi boyunca saklanır.
        </li>
      </ul>
      <p>
        Bu kayıtlar yalnızca yasal yükümlülük için tutulur; başka hiçbir
        amaçla kullanılmaz ve süre dolduğunda silinir.
      </p>

      <h2>4. Platformlar üzerinden silme</h2>
      <p>
        Uygulamaya verdiğiniz erişimi platformların kendi ayarlarından da
        kaldırabilirsiniz. Bu durumda uygulama hesabınıza erişemez hâle
        gelir:
      </p>
      <ul>
        <li>
          <strong>Facebook / Instagram:</strong> Ayarlar &gt; Uygulamalar ve
          Web Siteleri
        </li>
        <li><strong>Google:</strong> myaccount.google.com &gt; Güvenlik &gt; Üçüncü taraf uygulamalar</li>
        <li><strong>LinkedIn:</strong> Ayarlar &gt; Veri Gizliliği &gt; İzin verilen hizmetler</li>
        <li><strong>TikTok:</strong> Ayarlar &gt; Güvenlik &gt; Bağlı uygulamalar</li>
        <li><strong>X:</strong> Ayarlar &gt; Güvenlik ve hesap erişimi &gt; Uygulamalar</li>
      </ul>
      <p>
        Platform üzerinden erişimi kaldırmak, bizim veritabanımızdaki
        kayıtları otomatik silmez — onun için yukarıdaki 1. ya da 2. adımı
        uygulayın.
      </p>
    </Sayfa>
  );
}

/** Doğrudan /legal açılırsa gizlilik sayfasına yönlendir. */
export default function Legal() {
  const { pathname } = useLocation();
  if (pathname.includes("kullanim")) return <KullanimKosullari />;
  if (pathname.includes("silme")) return <VeriSilme />;
  return <Gizlilik />;
}
