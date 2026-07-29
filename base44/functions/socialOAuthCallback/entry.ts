// AjansPro — Custom OAuth Proxy: Adım 2 — Platform code'unu token'a çevirir,
// platform_user_id'yi çeker, SocialMediaAccount'a yazar. Kredi harcamaz.
// Bu endpoint platformdan tarayıcı yönlendirmesiyle (GET) çağrılır.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function getCallbackUrl(appId) {
  return `https://${appId}.base44.app/functions/socialOAuthCallback`;
}

// Tarayıcıya basit "kapan" HTML'i döndürür
function closePage(message, ok) {
  const color = ok ? "#16a34a" : "#dc2626";
  const title = ok ? "Bağlantı Başarılı ✓" : "Bağlantı Hatası";
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}
    .card{text-align:center;padding:32px;max-width:360px}h2{color:${color};margin:0 0 8px}p{color:#475569;font-size:14px}</style></head>
    <body><div class="card"><h2>${title}</h2><p>${message}</p><p style="margin-top:16px;color:#94a3b8">Bu pencere otomatik kapanacak…</p></div>
    <script>setTimeout(function(){window.close()},2000)</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// --- Token exchange & profil çekimi ---

async function exchangeInstagram(code, clientId, clientSecret, redirectUri) {
  const form = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret,
    grant_type: "authorization_code", redirect_uri: redirectUri, code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_message || "Instagram token alınamadı");

  // Kısa ömürlü token'ı uzun ömürlüye (60 gün) çevir
  const longRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${data.access_token}`);
  const longData = await longRes.json();
  const token = longData.access_token || data.access_token;
  const expiresIn = longData.expires_in || 60 * 24 * 3600;

  const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
  const me = await meRes.json();
  return { token, expiresIn, userId: me.id, username: me.username };
}

async function exchangeFacebook(code, clientId, clientSecret, redirectUri) {
  const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error?.message || "Facebook token alınamadı");
  const userToken = data.access_token;

  // Yönetilen ilk sayfayı al — Page token + Page ID paylaşım için gerekli
  const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
  const pages = await pagesRes.json();
  const page = pages.data?.[0];
  if (!page) throw new Error("Yönetilen Facebook sayfası bulunamadı");
  return { token: page.access_token, expiresIn: 60 * 24 * 3600, userId: page.id, username: page.name };
}

async function exchangeLinkedin(code, clientId, clientSecret, redirectUri) {
  const form = new URLSearchParams({
    grant_type: "authorization_code", code, redirect_uri: redirectUri,
    client_id: clientId, client_secret: clientSecret,
  });
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || "LinkedIn token alınamadı");

  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { "Authorization": `Bearer ${data.access_token}` },
  });
  const me = await meRes.json();
  return { token: data.access_token, expiresIn: data.expires_in || 5184000, userId: me.sub, username: me.name };
}

async function exchangeTiktok(code, clientId, clientSecret, redirectUri) {
  const form = new URLSearchParams({
    client_key: clientId, client_secret: clientSecret,
    code, grant_type: "authorization_code", redirect_uri: redirectUri,
  });
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || "TikTok token alınamadı");
  return { token: data.access_token, expiresIn: data.expires_in || 86400, userId: data.open_id, username: data.open_id, refreshToken: data.refresh_token };
}

async function exchangeTwitter(code, clientId, clientSecret, redirectUri) {
  const basic = btoa(`${clientId}:${clientSecret}`);
  const form = new URLSearchParams({
    grant_type: "authorization_code", code, redirect_uri: redirectUri,
    code_verifier: "challenge", client_id: clientId,
  });
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${basic}` },
    body: form,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || "Twitter token alınamadı");

  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { "Authorization": `Bearer ${data.access_token}` },
  });
  const me = await meRes.json();
  return { token: data.access_token, expiresIn: data.expires_in || 7200, userId: me.data?.id, username: me.data?.username, refreshToken: data.refresh_token };
}

const SECRET_ENV = {
  instagram: { id: "INSTAGRAM_CLIENT_ID", secret: "INSTAGRAM_CLIENT_SECRET", fn: exchangeInstagram },
  facebook: { id: "FACEBOOK_CLIENT_ID", secret: "FACEBOOK_CLIENT_SECRET", fn: exchangeFacebook },
  linkedin: { id: "LINKEDIN_CLIENT_ID", secret: "LINKEDIN_CLIENT_SECRET", fn: exchangeLinkedin },
  tiktok: { id: "TIKTOK_CLIENT_KEY", secret: "TIKTOK_CLIENT_SECRET", fn: exchangeTiktok },
  twitter: { id: "TWITTER_CLIENT_ID", secret: "TWITTER_CLIENT_SECRET", fn: exchangeTwitter },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const errParam = url.searchParams.get("error_description") || url.searchParams.get("error");

    if (errParam) return closePage("Yetkilendirme reddedildi: " + errParam, false);
    if (!code || !stateRaw) return closePage("Eksik yetkilendirme bilgisi", false);

    let state;
    try { state = JSON.parse(atob(stateRaw)); } catch { return closePage("Geçersiz state", false); }
    const { company_id, platform } = state;

    const cfg = SECRET_ENV[platform];
    if (!cfg) return closePage("Bilinmeyen platform", false);

    const clientId = Deno.env.get(cfg.id);
    const clientSecret = Deno.env.get(cfg.secret);
    if (!clientId || !clientSecret) return closePage(`${platform} kimlik bilgileri ayarlanmamış`, false);

    const appId = Deno.env.get("BASE44_APP_ID");
    const redirectUri = getCallbackUrl(appId);

    const result = await cfg.fn(code, clientId, clientSecret, redirectUri);

    const company = await base44.asServiceRole.entities.Company.get(company_id).catch(() => null);

    const accountData = {
      company_id,
      company_name: company?.name || "",
      platform,
      account_username: result.username || "",
      platform_user_id: result.userId || "",
      access_token: result.token,
      refresh_token: result.refreshToken || null,
      is_connected: true,
      token_expires_at: new Date(Date.now() + (result.expiresIn * 1000)).toISOString(),
    };

    const existing = await base44.asServiceRole.entities.SocialMediaAccount.filter({ company_id, platform });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.SocialMediaAccount.update(existing[0].id, accountData);
    } else {
      await base44.asServiceRole.entities.SocialMediaAccount.create(accountData);
    }

    return closePage(`@${result.username || platform} hesabı bağlandı.`, true);
  } catch (error) {
    console.error("socialOAuthCallback error:", error);
    return closePage(error.message, false);
  }
});