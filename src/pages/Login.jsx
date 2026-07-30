// ============================================================
// Giriş sayfası
//
// Base44'te giriş kendi platformunda oluyordu, uygulamada giriş ekranı yoktu.
// Supabase'e geçtikten sonra bu ekran gerekli hale geldi.
//
// E-posta + şifre kullanıyor. Üç kullanıcı için en az sürtünmeli yol bu;
// Google ile giriş de altta duruyor ama Supabase'de Google sağlayıcısı
// yapılandırılmadan çalışmaz, o yüzden gizli.
// ============================================================
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_LOGIN === 'true';

export default function Login() {
  const { authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState('login'); // 'login' | 'reset'

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'reset') {
        await base44.auth.resetPassword(email.trim());
        setInfo('Şifre yenileme bağlantısı e-postana gönderildi.');
        setMode('login');
      } else {
        await base44.auth.signInWithPassword(email.trim(), password);
        // AuthContext onAuthStateChange ile devreye girip yönlendiriyor.
        const next = new URLSearchParams(window.location.search).get('next');
        window.location.href = next || '/';
      }
    } catch (err) {
      const msg = String(err.message || '');
      // Supabase mesajları İngilizce; en sık görülenleri çeviriyoruz.
      if (msg.includes('Invalid login credentials')) {
        setError('E-posta veya şifre hatalı.');
      } else if (msg.includes('Email not confirmed')) {
        setError('E-posta adresin doğrulanmamış. Gelen kutunu kontrol et.');
      } else if (msg.includes('rate limit') || msg.includes('Too many')) {
        setError('Çok fazla deneme. Birkaç dakika bekle.');
      } else {
        setError(msg || 'Giriş yapılamadı.');
      }
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async () => {
    setError(null);
    try {
      await base44.auth.login(window.location.origin);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Ne-Pa Panel</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'reset' ? 'Şifre yenileme' : 'Devam etmek için giriş yap'}
          </p>
        </div>

        {authError?.type === 'account_disabled' && (
          <div className="mb-4 flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authError.message}</span>
          </div>
        )}

        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@nepa.com"
            />
          </div>

          {mode === 'login' && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="flex gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'reset' ? 'Bağlantı gönder' : 'Giriş yap'}
          </Button>

          <button
            type="button"
            className="w-full text-xs text-slate-500 hover:text-slate-800"
            onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setError(null); setInfo(null); }}
          >
            {mode === 'login' ? 'Şifremi unuttum' : 'Girişe dön'}
          </button>

          {GOOGLE_ENABLED && mode === 'login' && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">veya</span></div>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={googleLogin}>
                Google ile devam et
              </Button>
            </>
          )}
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Hesabın yoksa yöneticinden davet istemen gerekiyor.
        </p>
      </div>
    </div>
  );
}
