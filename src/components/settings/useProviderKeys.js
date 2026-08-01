// Kayıtlı sağlayıcı anahtarlarının DURUMUNU okur — değerlerini değil.
//
// provider_key_status() RPC'si yalnızca { provider, has_key, updated_at }
// döner. Anahtarın kendisi Supabase Vault'ta şifreli durur ve tarayıcıya
// hiçbir koşulda inmez.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';

export default function useProviderKeys() {
  const [status, setStatus] = useState({});   // { openrouter: {has_key, updated_at}, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('provider_key_status');
      if (error) throw new Error(error.message);
      const map = {};
      for (const row of data ?? []) {
        map[row.provider] = { has_key: row.has_key, updated_at: row.updated_at };
      }
      setStatus(map);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, error, refresh };
}
