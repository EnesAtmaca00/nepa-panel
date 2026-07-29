import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// HTML'den görünür metni temizleyerek çıkar
function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url, extract_content } = await req.json();
    if (!url) return Response.json({ error: 'URL gerekli' }, { status: 400 });

    let domain = '';
    let normalizedUrl = url;
    try {
      if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = 'https://' + normalizedUrl;
      domain = new URL(normalizedUrl).hostname;
    } catch {
      return Response.json({ error: 'Geçersiz URL' }, { status: 400 });
    }

    try {
      const res = await fetch(normalizedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
        signal: AbortSignal.timeout(12000),
      });
      const html = await res.text();

      const titleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i);

      const descMatch =
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

      const imageMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

      // Layout/içerik ipucu için ilk başlıkları çek (referans site analizinin derinliği için)
      const headings = [];
      const hMatches = html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
      for (const m of hMatches) {
        const txt = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (txt && txt.length < 120) headings.push(txt);
        if (headings.length >= 12) break;
      }

      const base = {
        title: titleMatch?.[1]?.trim() || '',
        description: descMatch?.[1]?.trim() || '',
        headings,
        thumbnail: imageMatch?.[1] || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        domain,
      };

      // İçerik çekme modu — eski siteden ham metni döndür (hakkımızda/misyon/vizyon/ürünler/yorumlar AI tarafından ayrıştırılır)
      if (extract_content) {
        const fullText = extractText(html).slice(0, 8000);
        base.full_text = fullText;
        base.page_links = [];
        // Aynı domaindeki iç sayfa linklerini topla (hakkımızda, ürünler vb. tespiti için)
        const linkMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
        const seen = new Set();
        for (const m of linkMatches) {
          const href = m[1];
          const label = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          if (!label || label.length > 40) continue;
          if (/hakk|about|misyon|vizyon|mission|vision|ürün|urun|product|hizmet|service|yorum|referans|review|testimonial|iletişim|iletisim|contact/i.test(label + ' ' + href)) {
            const key = label.toLowerCase();
            if (!seen.has(key)) { seen.add(key); base.page_links.push({ label, href }); }
          }
          if (base.page_links.length >= 15) break;
        }
      }

      return Response.json(base);
    } catch {
      return Response.json({
        title: '',
        description: '',
        thumbnail: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        domain,
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});