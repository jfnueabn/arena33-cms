const pageSections = require('./page-sections');

module.exports = async function migratePages(conn) {
  const [columns] = await conn.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sections'");
  const names = new Set(columns.map(c => c.COLUMN_NAME));
  if (!names.has('page_slug')) await conn.query("ALTER TABLE sections ADD COLUMN page_slug VARCHAR(64) NOT NULL DEFAULT 'home'");
  if (!names.has('template')) await conn.query("ALTER TABLE sections ADD COLUMN template VARCHAR(64) NOT NULL DEFAULT ''");
  if (!names.has('is_archived')) await conn.query("ALTER TABLE sections ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0");
  await conn.beginTransaction();
  try {
    await conn.query("UPDATE sections SET page_slug = 'shared' WHERE section_key IN ('header', 'footer')");
    await conn.query("UPDATE sections SET template = section_key WHERE template = ''");
    const [settingsRows] = await conn.query('SELECT setting_key, setting_value FROM settings');
    const settings = Object.fromEntries(settingsRows.map(r => [r.setting_key, r.setting_value]));
    const homeSettings = Object.fromEntries(['seo_title', 'seo_description', 'seo_keywords', 'og_image', 'robots_index'].map(k => [k, settings[k] || '']));
    await conn.query('INSERT IGNORE INTO landing_pages (slug, title, content) VALUES (?, ?, ?)', ['home', 'Homepage', JSON.stringify(homeSettings)]);
    const [[page]] = await conn.query("SELECT * FROM landing_pages WHERE slug = 'popular-games' FOR UPDATE");
    if (page) {
      const content = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
      if (!content._sections_migrated) {
        for (const [i, section] of pageSections({ ...page, content }).entries()) {
          await conn.query(
            'INSERT IGNORE INTO sections (section_key, page_slug, template, name, title, eyebrow, subtitle, content, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [section.section_key, section.page_slug, section.template, section.name, section.title, section.eyebrow, section.subtitle, JSON.stringify(section.content), (i + 1) * 10]
          );
        }
        // Keep the original document as a migration backup; never overwrite section edits on reruns.
        await conn.query("UPDATE landing_pages SET content = ? WHERE slug = 'popular-games'", [JSON.stringify({ ...content, og_image: content.image || '', robots_index: '1', _sections_migrated: true })]);
      }
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; }
};
