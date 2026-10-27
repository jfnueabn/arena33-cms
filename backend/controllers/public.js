const db = require('../db');
const { escapeHtml, siteUrl } = require('../utils/view-helpers');
const { safeUrl } = require('../utils/view-helpers');
const { locales, pagePath, localizeUrl } = require('../utils/locales');
const templates = new Set([...require('../db/defaults').sections.map(s => s.section_key), ...require('../db/landing-section-defaults').map(s => s.template), ...require('../services/section-library').map(s => s.template)]);

exports.show = slug => async (req, res, next) => {
  try {
    const locale = req.params.locale || 'en';
    const [settings, page, sections] = await Promise.all([db.getSettings(), db.getPage(slug, locale), db.getSections(slug, locale)]);
    const preview = req.query.preview === '1' && req.session.admin;
    if (!page || (!page.is_visible && !preview)) return res.status(404).type('text/plain').send('Page not found');
    if (preview) res.set('Cache-Control', 'no-store');
    const byKey = Object.fromEntries(sections.map(s => [s.section_key, s]));
    const body = sections.filter(s => !s.is_fixed && s.is_visible && templates.has(s.template) &&
      !(s.template === 'promo' && s.content.expires_at && Date.parse(s.content.expires_at) < Date.now()));
    const faqItems = body.flatMap(s => s.template === 'builder_section' ? s.content.blocks.filter(block=>block.type==='faq').flatMap(block=>block.content.items) : ['faq','games_faq','builder_faq'].includes(s.template) ? s.content.items || [] : []);
    const canonical = new URL(pagePath(slug, locale), siteUrl(settings)).href;
    res.render('index', {
      settings: { ...settings, ...page.content, language: locales.find(l => l.code === locale).html, robots_index: preview ? '0' : (settings.robots_index === '0' ? '0' : page.content.robots_index) },
      heroTags:require('../utils/hero-tags'), sectionLayout:require('../services/section-layout'), previewMode:!!preview, locale, pageSlug: slug, localeOptions: locales, pagePath,
      languagePath: (page, language) => pagePath(page, language) + (preview ? '?preview=1' : ''),
      t: text => require('../utils/ui-translations')(text, locale),
      safeUrl: url => safeUrl(localizeUrl(url, locale)),
      alternateLinks: locales.map(l => ({ language: l.html, url: new URL(pagePath(slug, l.code), siteUrl(settings)).href })),
      canonical, header: byKey.header, footer: byKey.footer, sections: body, faqItems, year: new Date().getFullYear()
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
    const urls = [];
    for (const locale of locales) {
      const [translatedPages, translatedSections] = await Promise.all([db.getPages(locale.code), db.getSections(null, locale.code)]);
      urls.push(...translatedPages.filter(p => p.is_visible && settings.robots_index !== '0' && p.content.robots_index !== '0').map(page => {
        const dates = [page.updated_at, ...translatedSections.filter(s => s.page_slug === page.slug || s.page_slug === 'shared').map(s => s.updated_at)].filter(Boolean).map(d => new Date(d).getTime());
        const lastmod = new Date(dates.length ? Math.max(...dates) : Date.now()).toISOString().slice(0, 10);
        const url = new URL(pagePath(page.slug, locale.code), siteUrl(settings)).href;
        return '<url><loc>' + escapeHtml(url) + '</loc><lastmod>' + lastmod + '</lastmod></url>';
      }));
    }
    res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>');
  } catch (err) { next(err); }
};
