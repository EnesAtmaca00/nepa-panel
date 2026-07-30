import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Base44 vite eklentisi kaldırıldı (HMR bildirimi, analitik, görsel düzenleyici
// gibi Base44'e özgü şeyler sağlıyordu). '@' takma adını o eklenti tanımlıyordu,
// bu yüzden burada elle tanımlanması gerekiyor.
export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
})
