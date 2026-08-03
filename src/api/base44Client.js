// ============================================================
// Base44 SDK uyumluluk katmanı — Supabase destekli.
//
// AMAÇ: 128 uygulama dosyasının HİÇBİRİNE dokunmadan Base44'ten çıkmak.
// Bu dosya `base44` nesnesinin aynı API yüzeyini sunar, altta Supabase çalışır.
// Uygulama kodundaki `base44.entities.Company.filter(...)` çağrıları
// olduğu gibi çalışmaya devam eder.
//
// Desteklenen yüzey (kod tabanında gerçekten kullanılan her şey):
//   entities.<Ad>.{ filter, list, get, create, update, delete, bulkCreate }
//   auth.{ me, logout, login }
//   functions.invoke(ad, payload)
//   asServiceRole.*   (yalnızca sunucu tarafı)
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { ENTITY_TABLE, RENAMED_FIELDS } from './entityMap';
import { applyWhere, applySort } from './queryTranslate';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı değil. .env.local dosyanı kontrol et.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ---------- yardımcılar ----------

/** Base44 hataları throw ederdi; aynı davranışı koruyoruz. */
function unwrap({ data, error }, ctx) {
  if (error) {
    const e = new Error(`[${ctx}] ${error.message}`);
    e.cause = error;
    e.code = error.code;
    throw e;
  }
  return data;
}

/** Yeniden adlandırılmış alanları çevir (yaz yönü). */
function mapOut(table, obj) {
  const map = RENAMED_FIELDS[table];
  if (!map || !obj) return obj;
  const out = { ...obj };
  for (const [from, to] of Object.entries(map)) {
    if (from in out) { out[to] = out[from]; delete out[from]; }
  }
  return out;
}

// ---------- entity fabrikası ----------

function makeEntity(entityName, client) {
  const table = ENTITY_TABLE[entityName];
  if (!table) throw new Error(`Bilinmeyen entity: ${entityName} (entityMap.js'e ekle)`);
  const from = () => client.from(table);

  return {
    /** filter(where, sort?, limit?) */
    async filter(where = {}, sort = null, limit = null) {
      let q = applyWhere(from().select('*'), where);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      return unwrap(await q, `${entityName}.filter`) ?? [];
    },

    /** list(sort?, limit?) */
    async list(sort = null, limit = null) {
      let q = applySort(from().select('*'), sort);
      if (limit) q = q.limit(limit);
      return unwrap(await q, `${entityName}.list`) ?? [];
    },

    /** get(id) — bulunamazsa Base44 gibi null döner, patlamaz */
    async get(id) {
      const { data, error } = await from().select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`[${entityName}.get] ${error.message}`);
      return data;
    },

    async create(payload) {
      const q = from().insert(mapOut(table, payload)).select().single();
      return unwrap(await q, `${entityName}.create`);
    },

    async bulkCreate(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return [];
      const q = from().insert(rows.map(r => mapOut(table, r))).select();
      return unwrap(await q, `${entityName}.bulkCreate`) ?? [];
    },

    async update(id, payload) {
      const q = from().update(mapOut(table, payload)).eq('id', id).select().single();
      return unwrap(await q, `${entityName}.update`);
    },

    async delete(id) {
      const q = from().delete().eq('id', id);
      unwrap(await q, `${entityName}.delete`);
      return { success: true };
    },
  };
}

function makeEntities(client) {
  // Lazy proxy: her entity ilk erişimde oluşturulup önbelleklenir.
  const cache = {};
  return new Proxy({}, {
    get(_t, name) {
      if (typeof name !== 'string') return undefined;
      if (!cache[name]) cache[name] = makeEntity(name, client);
      return cache[name];
    },
    has: (_t, name) => name in ENTITY_TABLE,
    ownKeys: () => Object.keys(ENTITY_TABLE),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}

// ---------- auth ----------

function makeAuth(client) {
  return {
    /**
     * base44.auth.me() — oturumdaki kullanıcıyı app_users profiliyle
     * BİRLEŞTİRİLMİŞ döner. Base44'te role/agency_role aynı nesnedeydi;
     * uygulama kodu (RoleGuard, PermissionGate, Sidebar) buna güveniyor.
     */
    async me() {
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) throw new Error('Oturum açılmamış');

      const { data: profile } = await client
        .from('app_users').select('*').eq('id', user.id).maybeSingle();

      // app_users satırı YOKSA bu sessizce geçilecek bir durum değil.
      //
      // Eskiden burada `active: profile?.active ?? true` yazıyordu:
      // satır yoksa "herhalde aktiftir" deyip kullanıcıyı içeri alıyordu.
      // Panel normal açılıyor, menü görünüyor — ama veritabanındaki RLS
      // kuralları auth.uid() ile eşleşen app_users satırını arıyor,
      // bulamayınca HER tabloyu boş döndürüyor. Üstelik bu bir hata
      // değil, başarılı-ama-sıfır-satır yanıtı; ekranda hiçbir uyarı
      // çıkmıyor ve kullanıcı "bütün verilerim gitti" sanıyor.
      //
      // Artık bayrak taşınıyor, AuthContext bunu görünce açıkça söylüyor.
      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name ?? user.user_metadata?.full_name ?? '',
        role: profile?.role ?? 'user',
        agency_role: profile?.agency_role ?? 'editor',
        assigned_companies: profile?.assigned_companies ?? [],
        active: profile?.active ?? false,
        has_profile: !!profile,
        created_date: profile?.created_date,
      };
    },

    async logout(redirectUrl) {
      await client.auth.signOut();
      if (redirectUrl) window.location.href = redirectUrl;
    },

    async login(redirectUrl) {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl || window.location.origin },
      });
      if (error) throw error;
      return data;
    },

    /** E-posta + şifre ile giriş (Login sayfası bunu kullanıyor). */
    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return data;
    },

    /** Şifre sıfırlama e-postası. */
    async resetPassword(email, redirectTo) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${window.location.origin}/sifre-yenile`,
      });
      if (error) throw new Error(error.message);
    },

    /**
     * base44.auth.updateMe(data) — Hesabim sayfası kullanıyor.
     * Base44'te kullanıcı alanları tek yerdeydi; burada full_name gibi
     * profil alanları app_users'a, şifre/e-posta auth'a gider.
     */
    async updateMe(payload = {}) {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('Oturum açılmamış');

      const { password, email, ...profile } = payload;

      if (password || (email && email !== user.email)) {
        const upd = {};
        if (password) upd.password = password;
        if (email && email !== user.email) upd.email = email;
        const { error } = await client.auth.updateUser(upd);
        if (error) throw new Error(error.message);
      }

      // Yetki alanlarını kullanıcının kendisi değiştiremez — RLS de engelliyor,
      // burada da eleyip sessiz bir hataya dönmesini önlüyoruz.
      delete profile.role;
      delete profile.agency_role;
      delete profile.assigned_companies;
      delete profile.active;
      delete profile.id;

      if (Object.keys(profile).length) {
        const q = client.from('app_users').update(profile).eq('id', user.id).select().single();
        unwrap(await q, 'auth.updateMe');
      }
      return this.me();
    },

    /** Base44 harici bir giriş sayfasına yönlendiriyordu; artık kendi sayfamız var. */
    redirectToLogin(returnTo) {
      const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
      window.location.href = `/giris${next}`;
    },

    onAuthStateChange: (cb) => client.auth.onAuthStateChange(cb),
    getSession: () => client.auth.getSession(),
  };
}

// ---------- users (ekip yönetimi) ----------

function makeUsers(client) {
  return {
    /**
     * base44.users.inviteUser(email, role) — TeamTab kullanıyor.
     *
     * Base44 bunu kendi yönetim API'siyle yapıyordu. Supabase'de kullanıcı
     * davet etmek service_role anahtarı gerektirir; anon anahtarla tarayıcıdan
     * YAPILAMAZ (yapılabilse ciddi bir güvenlik açığı olurdu).
     *
     * Bu yüzden bir Edge Function'a devrediliyor: supabase/functions/inviteUser
     */
    async inviteUser(email, role = 'user') {
      const { data, error } = await client.functions.invoke('inviteUser', {
        body: { email, role },
      });
      if (error) {
        let detail = '';
        try { detail = await error.context?.text?.(); } catch { /* yut */ }
        throw new Error(`Davet gönderilemedi: ${error.message}${detail ? ` — ${detail}` : ''}`);
      }
      return data;
    },
  };
}

// ---------- integrations ----------

function makeIntegrations(client) {
  const BUCKET = 'uploads';
  return {
    Core: {
      /**
       * base44.integrations.Core.UploadFile({ file }) -> { file_url }
       * Supabase Storage'a yükler. 'uploads' bucket'ının var olması gerekir
       * (bkz. supabase/migrations/...storage.sql).
       *
       * Not: uygulama kodunda birkaç yerde "kredi tasarrufu" için bunun
       * yerine base64 data URL kullanılmış; oralara dokunulmadı.
       */
      async UploadFile({ file }) {
        if (!file) throw new Error('Dosya yok');
        const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error } = await client.storage.from(BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) throw new Error(`Yükleme başarısız: ${error.message}`);

        const { data } = client.storage.from(BUCKET).getPublicUrl(path);
        return { file_url: data.publicUrl, file_path: path };
      },
    },
  };
}

// ---------- functions ----------

function makeFunctions(client) {
  return {
    /**
     * base44.functions.invoke("aiInvoke", {...}) -> Supabase Edge Function.
     * Base44 { data } sarmalayıcısıyla dönerdi; aynısını koruyoruz ki
     * çağıran koddaki `const { data } = await ...invoke(...)` bozulmasın.
     */
    async invoke(name, payload = {}, options = {}) {
      const { data, error } = await client.functions.invoke(name, {
        body: payload,
        ...options,
      });
      if (error) {
        // Edge Function gövdesindeki hata mesajını yüzeye çıkar
        let detail = '';
        try { detail = await error.context?.text?.(); } catch { /* yut */ }
        throw new Error(`[fn:${name}] ${error.message}${detail ? ` — ${detail}` : ''}`);
      }
      return { data };
    },
  };
}

// ---------- client fabrikası ----------

export function createBase44Client(client) {
  return {
    entities: makeEntities(client),
    auth: makeAuth(client),
    functions: makeFunctions(client),
    users: makeUsers(client),
    integrations: makeIntegrations(client),
    app: { id: import.meta.env.VITE_APP_ID ?? 'nepa-panel' },
  };
}

export const base44 = createBase44Client(supabase);
export default base44;
