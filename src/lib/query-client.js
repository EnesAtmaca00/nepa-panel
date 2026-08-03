import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================================
// SORUN 1: sekmeden her çıkıp girdiğinde sayfa baştan yükleniyordu.
//
// SEBEP: react-query'de staleTime varsayılanı 0. Veri çekilir çekilmez
// "bayat" sayılıyor. Sekme değiştirmek bileşeni unmount/mount ettiği
// için her dönüşte yeniden ağ isteği gidiyordu.
//
// ------------------------------------------------------------
// SORUN 2 (daha kötüsü): veri gelmediğinde ekran SESSİZCE BOŞ kalıyordu.
//
// 140 useQuery çağrısının neredeyse hiçbirinde hata yakalama yok.
// Yetki hatası, oturum bitmesi, ağ kopması — hepsinin sonucu aynı:
// boş liste. Kullanıcı "verilerim gitti" sanıyor, oysa veri yerinde,
// sadece istek başarısız olmuş ve kimse söylememiş.
//
// Artık her sorgu hatası ekranda görünüyor. Sebebi ne olursa olsun
// kullanıcı ne olduğunu okuyabiliyor ve gerekiyorsa doğru adımı
// atabiliyor — birine sorması gerekmiyor.
// ============================================================

/** Aynı hatayı saniyede bir kez göster; 20 sorgu patlarsa 20 toast çıkmasın. */
const sonGosterim = new Map();
function birKezGoster(anahtar, fn) {
	const simdi = Date.now();
	if (simdi - (sonGosterim.get(anahtar) ?? 0) < 4000) return;
	sonGosterim.set(anahtar, simdi);
	fn();
}

/** Ham hatayı kullanıcının anlayacağı bir cümleye çevirir. */
function okunabilirHata(err) {
	const m = String(err?.message ?? err ?? '');
	const kod = err?.code ?? err?.cause?.code ?? '';

	// Oturum bitmiş / token geçersiz
	if (/JWT|jwt expired|invalid claim|not authenticated|Auth session missing/i.test(m)) {
		return {
			metin: 'Oturumun sona ermiş. Sayfayı yenileyip tekrar giriş yap.',
			tur: 'oturum',
		};
	}
	// RLS engeli — kullanıcı yetkisiz ya da app_users satırı bozuk
	if (kod === '42501' || /row-level security|permission denied|policy/i.test(m)) {
		return {
			metin: 'Bu veriye erişim yetkin yok. Hesabın pasif olabilir ya da müşteri ataması yapılmamış olabilir — yöneticine sor.',
			tur: 'yetki',
		};
	}
	// Şema önbelleği / eksik kolon
	if (kod === 'PGRST204' || kod === 'PGRST205' || /schema cache|Could not find the/i.test(m)) {
		return { metin: 'Veritabanı şeması güncel değil: ' + m, tur: 'sema' };
	}
	// Ağ
	if (/Failed to fetch|NetworkError|ERR_INTERNET/i.test(m)) {
		return { metin: 'Sunucuya ulaşılamıyor. İnternet bağlantını kontrol et.', tur: 'ag' };
	}
	return { metin: m || 'Bilinmeyen hata', tur: 'diger' };
}

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			const { metin, tur } = okunabilirHata(error);
			// Konsola HAM hata — teşhis için gerekli
			console.error('[sorgu hatası]', query.queryKey, error);
			birKezGoster(tur + metin, () => {
				toast.error('Veriler yüklenemedi', { description: metin, duration: 8000 });
			});
		},
	}),
	mutationCache: new MutationCache({
		onError: (error) => {
			const { metin } = okunabilirHata(error);
			console.error('[kaydetme hatası]', error);
			birKezGoster('mut' + metin, () => {
				toast.error('İşlem başarısız', { description: metin, duration: 8000 });
			});
		},
	}),
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			retry: (sayi, err) => {
				// Yetki ve oturum hatalarını tekrar denemenin anlamı yok
				const { tur } = okunabilirHata(err);
				if (tur === 'yetki' || tur === 'oturum') return false;
				return sayi < 1;
			},
		},
	},
});
