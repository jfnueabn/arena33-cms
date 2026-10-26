const db = require('../db');
const { escapeHtml, siteUrl } = require('../utils/view-helpers');

exports.home = async (req, res, next) => {
  try {
    const [settings, sections] = await Promise.all([db.getSettings(), db.getSections()]);
    const byKey = Object.fromEntries(sections.map(s => [s.section_key, s]));
    const now = Date.now();
    const body = sections.filter(s => {
      if (s.is_fixed || !s.is_visible) return false;
      // Promos with an expiry date hide themselves automatically.
      if (s.section_key === 'promo' && s.content.expires_at && Date.parse(s.content.expires_at) < now) return false;
      return true;
    });
    const faq = body.find(s => s.section_key === 'faq');
    res.render('index', {
      settings,
      canonical: siteUrl(settings),
      header: byKey.header,
      footer: byKey.footer,
      sections: body,
      faqItems: faq ? faq.content.items : [],
      year: new Date().getFullYear()
    });
  } catch (err) { next(err); }
};

exports.robots = async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    const allow = settings.robots_index === '1';
    res.type('text/plain').send(
      `User-agent: *\n${allow ? 'Allow: /' : 'Disallow: /'}\nDisallow: /admin\n\nSitemap: ${siteUrl(settings)}sitemap.xml\n`
    );
  } catch (err) { next(err); }
};

exports.sitemap = async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    const [[row]] = await db.pool.query('SELECT MAX(updated_at) AS last FROM sections');
    const lastmod = (row.last ? new Date(row.last) : new Date()).toISOString().slice(0, 10);
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url><loc>${escapeHtml(siteUrl(settings))}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`
    );
  } catch (err) { next(err); }
};
