import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { account_id } = await req.json();

    await base44.asServiceRole.entities.SocialMediaAccount.update(account_id, {
      is_connected: false,
      access_token: null,
      refresh_token: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("disconnectSocial error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});