const db = require('../db');

exports.update = async (req, res, next) => {
  try {
    const page = await db.getPage(req.params.slug, req.locale || 'en');
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const { content, is_visible } = req.body;
    if (!content || typeof content !== 'object' || Array.isArray(content) || typeof is_visible !== 'boolean' ||
        Object.keys(page.content).some(key => typeof content[key] !== 'string') || !['0', '1'].includes(content.robots_index)) {
      return res.status(400).json({ error: 'Invalid page settings' });
    }
    const clean = Object.fromEntries(Object.keys(page.content).map(k => [k, content[k].slice(0, 2000)]));
    // JSON_SET preserves the original migration backup in existing records.
    await db.pool.query(
      "UPDATE landing_pages SET content = JSON_SET(content, '$.seo_title', ?, '$.seo_description', ?, '$.seo_keywords', ?, '$.og_image', ?, '$.robots_index', ?), is_visible = ? WHERE slug = ?",
      [clean.seo_title, clean.seo_description, clean.seo_keywords, clean.og_image, clean.robots_index, is_visible ? 1 : 0, page.slug]
    );
    const translation = await require('../services/automatic-translations').syncPage(page.slug);
    res.json({ page: await db.getPage(page.slug,'en'), translation });
  } catch (err) { next(err); }
};
