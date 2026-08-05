import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Base44 vite eklentisi kaldırıldı (HMR bildirimi, analitik, görsel düzenleyici
// gibi Base44'e özgü şeyler sağlıyordu). '@' takma adını o eklenti tanımlıyordu,
// bu yüzden burada elle tanımlanması gerekiyor.
export default defineConfig({
  // Teşhis sayfası hangi build'in çalıştığını gösterebilsin —
  // 'eski sürüme bakıyor olabilir miyim' sorusunu kesin cevaplar.
  define: { __BUILD_ZAMANI__: JSON.stringify(new Date().toISOString()) },
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
})
