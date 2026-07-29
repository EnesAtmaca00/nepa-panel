// AjansPro — Sosyal Medya Hesap Bağlama
// Manuel Access Token ile bağlanma. Instagram/Facebook/LinkedIn paylaşım için platform_user_id zorunludur.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id, platform, manual_token, account_username, platform_user_id } = await req.json();
    if (!company_id || !platform) {
      return Response.json({ error: "company_id ve platform zorunlu" }, { status: 400 });
    }

    // Manuel token ile bağlantı
    if (manual_token && account_username) {
      let resolvedUserId = (platform_user_id || "").trim();

      // Instagram: platform_user_id verilmediyse token'dan otomatik çekmeyi dene
      if (!resolvedUserId && platform === "instagram") {
        try {
          const meRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${encodeURIComponent(manual_token)}`);
          const meData = await meRes.json();
          if (meData.id) resolvedUserId = meData.id;
        } catch (_) { /* sessizce geç, kullanıcı elle girebilir */ }
      }

      const company = await base44.asServiceRole.entities.Company.get(company_id).catch(() => null);

      const accountData = {
        company_id,
        company_name: company?.name || "",
        platform,
        account_username,
        platform_user_id: resolvedUserId,
        access_token: manual_token,
        is_connected: true,
        token_expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(), // 60 gün
      };

      const existing = await base44.asServiceRole.entities.SocialMediaAccount.filter({ company_id, platform });
      let account;
      if (existing.length > 0) {
        account = await base44.asServiceRole.entities.SocialMediaAccount.update(existing[0].id, accountData);
      } else {
        account = await base44.asServiceRole.entities.SocialMediaAccount.create(accountData);
      }

      return Response.json({ success: true, account });
    }

    // Platform rehberi
    const platformGuides = {
      instagram: {
        name: "Instagram",
        guide: "Instagram Business hesabı + Facebook Developer App gerekir. Meta Business Suite veya Graph API Explorer'dan instagram_content_publish izinli token alın. ID otomatik çekilir, çekilemezse Business hesap ID'sini girin.",
        token_url: "https://developers.facebook.com/tools/explorer/",
        scopes: "instagram_basic, instagram_content_publish",
        needs_user_id: true,
        manual_required: true,
      },
      facebook: {
        name: "Facebook",
        guide: "Facebook Page için uzun süreli (60 gün) Page Access Token alın. Page ID'sini de girmeniz gerekir.",
        token_url: "https://developers.facebook.com/tools/explorer/",
        scopes: "pages_read_engagement, pages_manage_posts",
        needs_user_id: true,
        manual_required: true,
      },
      linkedin: {
        name: "LinkedIn",
        guide: "LinkedIn Developer portalından OAuth 2.0 token + Person/Organization URN ID'si alın.",
        token_url: "https://www.linkedin.com/developers/",
        scopes: "w_member_social",
        needs_user_id: true,
        manual_required: true,
      },
      tiktok: {
        name: "TikTok",
        guide: "TikTok for Developers'dan Content Posting API erişimi alın.",
        token_url: "https://developers.tiktok.com/",
        scopes: "video.publish",
        needs_user_id: false,
        manual_required: true,
      },
      twitter: {
        name: "Twitter/X",
        guide: "Twitter Developer portalından OAuth 2.0 token alın.",
        token_url: "https://developer.twitter.com/",
        scopes: "tweet.write, tweet.read",
        needs_user_id: false,
        manual_required: true,
      },
    };

    const info = platformGuides[platform];
    if (info) {
      return Response.json({ manual_required: true, platform, ...info });
    }

    return Response.json({ error: "Bilinmeyen platform" }, { status: 400 });

  } catch (error) {
    console.error("connectSocial error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});