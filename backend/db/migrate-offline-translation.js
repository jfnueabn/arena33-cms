const { hash } = require('../utils/translation-source');
module.exports = async function migrateOfflineTranslation(conn) {
  for (const table of ['section_translations', 'page_translations']) {
    const [columns] = await conn.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
    if (!columns.some(c => c.COLUMN_NAME === 'source_hash')) await conn.query(`ALTER TABLE ${table} ADD COLUMN source_hash CHAR(64) NULL`);
  }
  await conn.query(`CREATE TABLE IF NOT EXISTS translation_cache (
    source_hash CHAR(64) NOT NULL, locale VARCHAR(2) NOT NULL, translated_text TEXT NOT NULL,
    PRIMARY KEY (source_hash, locale)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // Existing starter translations are accepted as the initial baseline.
  const [sections] = await conn.query('SELECT * FROM sections');
  for (const section of sections) {
    const raw = typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
    const content = require('../utils/content-defaults')(raw, require('./landing-section-defaults').find(s=>s.section_key===section.section_key)?.content || {});
    const sourceHash = hash({ title:section.title, eyebrow:section.eyebrow, subtitle:section.subtitle || '', content });
    await conn.query('UPDATE section_translations SET source_hash = ? WHERE section_key = ? AND source_hash IS NULL', [sourceHash,section.section_key]);
  }
  const [pages] = await conn.query('SELECT * FROM landing_pages');
  for (const page of pages) {
    const data = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
    const content = Object.fromEntries(['seo_title','seo_description','seo_keywords','og_image','robots_index'].map(k=>[k,data[k]||'']));
    await conn.query('UPDATE page_translations SET source_hash = ? WHERE slug = ? AND source_hash IS NULL', [hash(content),page.slug]);
  }
};
