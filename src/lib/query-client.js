import { QueryClient } from '@tanstack/react-query';

// ============================================================
// SORUN: sekmeden her çıkıp girdiğinde sayfa baştan yükleniyordu.
//
// SEBEP: react-query'de staleTime varsayılanı 0. Veri çekilir çekilmez
// "bayat" sayılıyor. Sekme değiştirmek bileşeni unmount/mount ettiği
// için her dönüşte yeniden ağ isteği gidiyordu — 140 useQuery çağrısının
// yalnızca 26'sında staleTime belirtilmiş.
//
// ÇÖZÜM: makul bir global varsayılan. Tazelik zaten mutation'lardan
// sonra invalidateQueries ile geliyor; sekme dolaşmaktan değil.
//
//   staleTime 5 dk  — bu süre içinde sekme dolaşımı ağa hiç gitmez
//   gcTime   30 dk  — önbellek bu kadar bellekte kalır, geri dönünce
//                     ekran anında dolu gelir
//   refetchOnMount false — asıl "her girişte yenileniyor" hissi buradan
//
// Anlık tazelik gereken yerler (üretim işleri, canlı loglar) kendi
// staleTime'ını daha düşük veriyor; yerel ayar globali ezer.
// ============================================================

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			retry: 1,
		},
	},
});
