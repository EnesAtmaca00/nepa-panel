import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { template_id, company_id, subscribed } = await req.json();
    if (!template_id || !company_id) {
      return Response.json({ error: 'template_id ve company_id gerekli' }, { status: 400 });
    }

    // Service role ile şablonu oku
    const tpl = await base44.asServiceRole.entities.RecurringContentTemplate.get(template_id);
    if (!tpl) return Response.json({ error: 'Şablon bulunamadı' }, { status: 404 });

    const currentSubs = tpl.subscribed_companies || [];
    const newSubs = subscribed
      ? [...new Set([...currentSubs, company_id])]
      : currentSubs.filter(c => c !== company_id);

    await base44.asServiceRole.entities.RecurringContentTemplate.update(template_id, {
      subscribed_companies: newSubs,
    });

    return Response.json({ success: true, subscribed_companies: newSubs });
  } catch (error) {
    console.error('Error data:', JSON.stringify(error?.response?.data || error?.data || error?.message));
    return Response.json({ error: error.message }, { status: 500 });
  }
});