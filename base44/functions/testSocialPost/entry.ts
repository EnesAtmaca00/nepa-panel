import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Token'ı gerçekten doğrular — paylaşım yapmaz, sadece hesabın erişilebilir olduğunu test eder
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { account_id } = await req.json();
    const account = await base44.asServiceRole.entities.SocialMediaAccount.get(account_id);

    if (!account || !account.is_connected) {
      return Response.json({ success: false, message: "Hesap bağlı değil" });
    }

    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      return Response.json({ success: false, message: "Token süresi dolmuş — yeniden bağlayın" });
    }

    let ok = false;
    let detail = "";

    if (account.platform === "instagram") {
      const res = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${encodeURIComponent(account.access_token)}`);
      const data = await res.json();
      ok = !!data.id;
      detail = ok ? `@${data.username || account.account_username} doğrulandı` : (data.error?.message || "Token geçersiz");
    } else if (account.platform === "facebook") {
      const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(account.access_token)}`);
      const data = await res.json();
      ok = !!data.id;
      detail = ok ? "Token doğrulandı" : (data.error?.message || "Token geçersiz");
    } else if (account.platform === "twitter") {
      const res = await fetch("https://api.twitter.com/2/users/me", { headers: { "Authorization": `Bearer ${account.access_token}` } });
      ok = res.ok;
      detail = ok ? "Token doğrulandı" : "Token geçersiz";
    } else if (account.platform === "linkedin") {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { "Authorization": `Bearer ${account.access_token}` } });
      ok = res.ok;
      detail = ok ? "Token doğrulandı" : "Token geçersiz";
    } else {
      return Response.json({ success: false, message: `${account.platform} için test henüz desteklenmiyor` });
    }

    return Response.json({ success: ok, message: ok ? `✅ ${account.platform}: ${detail}` : `❌ ${detail}` });
  } catch (error) {
    console.error("testSocialPost error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});