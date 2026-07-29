// AjansPro — Custom OAuth Proxy: Adım 1 — Yetkilendirme URL'si üretir.
// Kredi harcamaz: tamamen kendi fetch akışımız, hiç connector kullanılmaz.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Callback URL — socialOAuthCallback fonksiyonunun public endpoint'i.
// Base44 fonksiyon URL formatı: https://{appId}.base44.app/functions/{fnName}
function getCallbackUrl(appId) {
  return `https://${appId}.base44.app/functions/socialOAuthCallback`;
}

function buildAuthUrl(platform, clientId, redirectUri, state) {
  const encRedirect = encodeURIComponent(redirectUri);
  const encState = encodeURIComponent(state);

  switch (platform) {
    case "instagram":
      // Instagram Business Login (Graph API)
      return `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encRedirect}&response_type=code&scope=${encodeURIComponent("instagram_business_basic,instagram_business_content_publish")}&state=${encState}`;

    case "facebook":
      return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encRedirect}&response_type=code&scope=${encodeURIComponent("pages_show_list,pages_read_engagement,pages_manage_posts,business_management")}&state=${encState}`;

    case "linkedin":
      return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encRedirect}&scope=${encodeURIComponent("openid profile email w_member_social")}&state=${encState}`;

    case "tiktok":
      return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientId}&response_type=code&scope=${encodeURIComponent("user.info.basic,video.publish")}&redirect_uri=${encRedirect}&state=${encState}`;

    case "twitter":
      // PKCE — challenge = plain "challenge" (S256 değil, plain method)
      return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encRedirect}&scope=${encodeURIComponent("tweet.read tweet.write users.read offline.access")}&state=${encState}&code_challenge=challenge&code_challenge_method=plain`;

    default:
      return null;
  }
}

const CLIENT_ID_ENV = {
  instagram: "INSTAGRAM_CLIENT_ID",
  facebook: "FACEBOOK_CLIENT_ID",
  linkedin: "LINKEDIN_CLIENT_ID",
  tiktok: "TIKTOK_CLIENT_KEY",
  twitter: "TWITTER_CLIENT_ID",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, platform } = await req.json();
    if (!company_id || !platform) {
      return Response.json({ error: "company_id ve platform zorunlu" }, { status: 400 });
    }

    const clientIdEnv = CLIENT_ID_ENV[platform];
    const clientId = clientIdEnv ? Deno.env.get(clientIdEnv) : null;
    if (!clientId) {
      return Response.json({ error: `${platform} için Client ID ayarlanmamış. Ayarlardan ekleyin.` }, { status: 400 });
    }

    const appId = Deno.env.get("BASE44_APP_ID");
    const redirectUri = getCallbackUrl(appId);

    // state: company_id + platform + user — callback'te çözeriz (base64)
    const state = btoa(JSON.stringify({ company_id, platform, uid: user.id }));

    const authUrl = buildAuthUrl(platform, clientId, redirectUri, state);
    if (!authUrl) return Response.json({ error: "Bilinmeyen platform" }, { status: 400 });

    return Response.json({ success: true, auth_url: authUrl, redirect_uri: redirectUri });
  } catch (error) {
    console.error("socialOAuthStart error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});