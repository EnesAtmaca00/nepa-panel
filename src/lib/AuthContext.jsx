// ============================================================
// AuthContext — Supabase Auth
//
// Base44 sürümü uygulamanın kimliğini doğrulamak için Base44'ün kendi
// /api/apps/public uç noktasını çağırıyor, oturumu URL'den gelen bir
// token'la takip ediyordu. İkisi de artık yok.
//
// Yüzey (useAuth ile dönen alanlar) BİLEREK aynı tutuldu — RoleGuard,
// PermissionGate, Sidebar, Layout ve sayfalar bu alanlara güveniyor.
// `appPublicSettings` da korunuyor; Base44'e özgüydü, artık sabit bir
// nesne dönüyor ki ona bakan kod bozulmasın.
// ============================================================
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44, supabase } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Base44'te uygulamanın herkese açık ayarlarıydı. Supabase'de karşılığı yok;
  // ona bakan kodu bozmamak için sabit tutuyoruz.
  const appPublicSettings = { id: 'nepa-panel', public_settings: {} };
  const isLoadingPublicSettings = false;

  /** Oturumdaki kullanıcıyı app_users profiliyle birleştirip yükler. */
  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      const me = await base44.auth.me();

      // app_users satırı yok — panel açılırsa her sayfa boş görünür ve
      // kullanıcı sebebini anlayamaz. Oturumu KAPATMIYORUZ ki mesajı
      // okuyabilsin ve yöneticiye ne söyleyeceğini bilsin.
      if (me.has_profile === false) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: 'profile_missing',
          message:
            'Giriş yapıldı ama bu hesabın panelde bir kullanıcı kaydı yok. ' +
            'Bu yüzden hiçbir veri görünmez. Yöneticinin Ayarlar > Ekip ' +
            'bölümünden hesabını eklemesi gerekiyor.',
        });
        return;
      }

      // Devre dışı bırakılmış hesap oturum açabilir ama panele girmemeli.
      if (me.active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'account_disabled', message: 'Hesabınız devre dışı bırakılmış.' });
        return;
      }

      setUser(me);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Oturum kontrolü başarısız:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message || 'Oturum doğrulanamadı' });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();

    // Oturum yenilenince / çıkış yapılınca durumu güncel tut.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        checkUserAuth();
      }
    });
    return () => subscription?.unsubscribe();
  }, [checkUserAuth]);

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    await supabase.auth.signOut();
    if (shouldRedirect) window.location.href = '/giris';
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.pathname + window.location.search);
  };

  // Base44 sürümünde vardı, bazı yerler çağırıyor olabilir.
  const checkAppState = checkUserAuth;

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
