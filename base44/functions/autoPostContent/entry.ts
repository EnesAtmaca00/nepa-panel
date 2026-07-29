import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Tek bir hesaba paylaşım yapar; { success, error } döner
async function postToAccount(account, post) {
  const caption = [post.caption, ...((post.hashtags || []).map(h => h.startsWith("#") ? h : `#${h}`))].filter(Boolean).join("\n\n");
  const mediaUrl = (post.media_urls || [])[0];
  const isVideo = post.media_type === "video" || (post.platform || "").includes("reels");

  // Token süresi kontrolü
  if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
    return { success: false, error: `${account.platform} token süresi dolmuş — yeniden bağlayın` };
  }

  try {
    if (account.platform === "instagram") {
      if (!account.platform_user_id) return { success: false, error: "Instagram Business hesap ID'si eksik — yeniden bağlayın" };
      if (!mediaUrl) return { success: false, error: "Medya URL'si bulunamadı" };

      // Instagram içerik yayınlama Facebook Graph API üzerinden yapılır (IG Business ID gerekli)
      const containerBody = isVideo
        ? { media_type: "REELS", video_url: mediaUrl, caption, access_token: account.access_token }
        : { image_url: mediaUrl, caption, access_token: account.access_token };

      const containerRes = await fetch(`https://graph.facebook.com/v21.0/${account.platform_user_id}/media`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(containerBody),
      });
      const containerData = await containerRes.json();
      if (!containerData.id) return { success: false, error: containerData.error?.message || "Instagram container oluşturulamadı" };

      // Video container'ı işlenene kadar bekle (poll)
      if (isVideo) {
        for (let i = 0; i < 12; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const statusRes = await fetch(`https://graph.facebook.com/v21.0/${containerData.id}?fields=status_code&access_token=${account.access_token}`);
          const statusData = await statusRes.json();
          if (statusData.status_code === "FINISHED") break;
          if (statusData.status_code === "ERROR") return { success: false, error: "Instagram video işleme hatası" };
        }
      }

      const publishRes = await fetch(`https://graph.facebook.com/v21.0/${account.platform_user_id}/media_publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: containerData.id, access_token: account.access_token }),
      });
      const publishData = await publishRes.json();
      return publishData.id ? { success: true } : { success: false, error: publishData.error?.message || "Instagram yayınlama başarısız" };
    }

    if (account.platform === "facebook") {
      if (!account.platform_user_id) return { success: false, error: "Facebook Page ID'si eksik" };
      const endpoint = mediaUrl
        ? `https://graph.facebook.com/v21.0/${account.platform_user_id}/${isVideo ? "videos" : "photos"}`
        : `https://graph.facebook.com/v21.0/${account.platform_user_id}/feed`;
      const body = mediaUrl
        ? (isVideo ? { file_url: mediaUrl, description: caption } : { url: mediaUrl, message: caption })
        : { message: caption };
      body.access_token = account.access_token;
      const fbRes = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const fbData = await fbRes.json();
      return fbData.id ? { success: true } : { success: false, error: fbData.error?.message || "Facebook paylaşımı başarısız" };
    }

    if (account.platform === "linkedin") {
      if (!account.platform_user_id) return { success: false, error: "LinkedIn URN ID'si eksik" };
      const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: { "Authorization": `Bearer ${account.access_token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
        body: JSON.stringify({
          author: `urn:li:person:${account.platform_user_id}`,
          lifecycleState: "PUBLISHED",
          specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: caption }, shareMediaCategory: "NONE" } },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      if (liRes.ok) return { success: true };
      const liData = await liRes.json().catch(() => ({}));
      return { success: false, error: liData.message || "LinkedIn paylaşımı başarısız" };
    }

    if (account.platform === "twitter") {
      const twRes = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { "Authorization": `Bearer ${account.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: caption.slice(0, 280) }),
      });
      if (twRes.ok) return { success: true };
      const twData = await twRes.json().catch(() => ({}));
      return { success: false, error: twData.detail || twData.title || "Twitter paylaşımı başarısız" };
    }

    if (account.platform === "tiktok") {
      if (!mediaUrl) return { success: false, error: "TikTok için video URL'si gerekli" };
      const mode = post.tiktok_post_mode === "direct" ? "direct" : "inbox";

      // inbox = taslağa gönder (audit gerekmez), direct = otomatik yayınla (audit gerekir)
      const endpoint = mode === "direct"
        ? "https://open.tiktokapis.com/v2/post/publish/video/init/"
        : "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";

      const ttBody = mode === "direct"
        ? {
            post_info: { title: caption.slice(0, 2200), privacy_level: "SELF_ONLY", disable_comment: false },
            source_info: { source: "PULL_FROM_URL", video_url: mediaUrl },
          }
        : {
            source_info: { source: "PULL_FROM_URL", video_url: mediaUrl },
          };

      const ttRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Authorization": `Bearer ${account.access_token}`, "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(ttBody),
      });
      const ttData = await ttRes.json();
      if (ttData.data?.publish_id) {
        return { success: true, note: mode === "inbox" ? "TikTok taslağına gönderildi" : "TikTok'a yayınlandı" };
      }
      return { success: false, error: ttData.error?.message || ttData.error?.code || "TikTok paylaşımı başarısız" };
    }

    return { success: false, error: `${account.platform} için otomatik paylaşım henüz desteklenmiyor — manuel yayınlayın` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const pendingPosts = await base44.asServiceRole.entities.PublishSchedule.filter({
      publish_type: "auto",
      status: "scheduled",
      deleted: false,
    }, "scheduled_at", 100);

    const due = pendingPosts.filter(p => {
      if (!p.scheduled_at) return false;
      // Onay bekleyen veya reddedilmiş gönderileri atla — sadece approved olanlar yayınlanır
      if (p.approval_status === "pending_approval" || p.approval_status === "rejected") return false;
      return new Date(p.scheduled_at) <= fiveMinutesFromNow;
    });

    if (due.length === 0) {
      return Response.json({ success: true, processed: 0, message: "Zamanı gelen onaylı gönderi yok" });
    }

    const results = [];

    for (const post of due) {
      try {
        // Çift-paylaşım kilidi: "posting" yap, zaten posting ise atla
        if (post.status === "posting") { results.push({ id: post.id, status: "skipped" }); continue; }
        await base44.asServiceRole.entities.PublishSchedule.update(post.id, { status: "posting" });

        const accounts = await base44.asServiceRole.entities.SocialMediaAccount.filter({
          company_id: post.company_id,
          is_connected: true,
        });

        const platformKey = post.platform?.replace(/_post|_reels|_story/, "");

        // Hedef hesaplar: seçilmişse onlar, yoksa platforma uyan tüm bağlı hesaplar
        let targets;
        if (post.target_account_ids?.length) {
          targets = accounts.filter(a => post.target_account_ids.includes(a.id));
        } else {
          targets = accounts.filter(a => a.platform === platformKey || a.platform === post.platform);
        }

        if (targets.length === 0) {
          await base44.asServiceRole.entities.PublishSchedule.update(post.id, {
            status: "failed",
            notes: (post.notes || "") + "\n[Hata] Bağlı hesap bulunamadı",
          });
          results.push({ id: post.id, status: "failed", reason: "no_account" });
          continue;
        }

        // Tüm hedef hesaplara paylaş
        const publishResults = [];
        for (const acc of targets) {
          const r = await postToAccount(acc, post);
          publishResults.push({ account_id: acc.id, platform: acc.platform, username: acc.account_username, ...r });
          if (r.success) {
            await base44.asServiceRole.entities.SocialMediaAccount.update(acc.id, { last_post_at: new Date().toISOString() }).catch(() => {});
          }
        }

        const anySuccess = publishResults.some(r => r.success);
        const allSuccess = publishResults.every(r => r.success);

        await base44.asServiceRole.entities.PublishSchedule.update(post.id, {
          status: anySuccess ? "published" : "failed",
          published_at: anySuccess ? new Date().toISOString() : undefined,
          published_by: "auto",
          publish_results: publishResults,
          notes: allSuccess ? post.notes : (post.notes || "") + "\n[Kısmi] " + publishResults.filter(r => !r.success).map(r => `${r.username}: ${r.error}`).join("; "),
        });

        await base44.asServiceRole.entities.Notification.create({
          title: anySuccess ? "Otomatik Paylaşım Tamamlandı" : "Otomatik Paylaşım Başarısız",
          message: `${post.company_name || "Müşteri"} — ${publishResults.filter(r => r.success).length}/${publishResults.length} hesapta paylaşıldı.`,
          severity: allSuccess ? "success" : (anySuccess ? "warning" : "warning"),
          channels: ["in_app"],
          read: false,
          company_id: post.company_id,
        }).catch(() => {});

        results.push({ id: post.id, status: anySuccess ? "published" : "failed", accounts: publishResults.length });
      } catch (postError) {
        console.error(`Post failed for ${post.id}:`, postError);
        await base44.asServiceRole.entities.PublishSchedule.update(post.id, {
          status: "failed",
          notes: (post.notes || "") + `\n[Hata] ${postError.message}`,
        }).catch(() => {});
        results.push({ id: post.id, status: "error", reason: postError.message });
      }
    }

    const published = results.filter(r => r.status === "published").length;
    const failed = results.filter(r => r.status !== "published" && r.status !== "skipped").length;

    console.log(`autoPostContent: ${published} yayınlandı, ${failed} başarısız`);
    return Response.json({ success: true, processed: due.length, published, failed, results });

  } catch (error) {
    console.error("autoPostContent error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});