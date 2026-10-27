const defaults = require('./welcome-bonus');
const contentDefaults = require('../utils/content-defaults');

module.exports = async function upgradeWelcomeBonus(conn) {
  await conn.beginTransaction();
  try {
    const [[page]] = await conn.query("SELECT content FROM landing_pages WHERE slug = 'welcome-bonus' FOR UPDATE");
    if (!page) { await conn.commit(); return; }
    const metadata = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
    if (metadata._presentation_version === 2) { await conn.commit(); return; }
    const [rows] = await conn.query("SELECT * FROM sections WHERE page_slug = 'welcome-bonus' FOR UPDATE");
    for (const row of rows) {
      const next = defaults.sections.find(s => s.section_key === row.section_key);
      if (!next) continue;
      const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
      // MySQL normalises JSON key order, so compare canonical JSON signatures.
      const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
      const original = require('./legacy-bonus-content.json')[row.section_key];
      const unchanged = original && JSON.stringify(canonical({ title: row.title, eyebrow: row.eyebrow, subtitle: row.subtitle || '', content, template: row.template })) === JSON.stringify(canonical(original));
      const updated = unchanged ? next : { ...row, template: next.template, content: contentDefaults(content, next.content) };
      if (JSON.stringify(canonical({ title: row.title, eyebrow: row.eyebrow, subtitle: row.subtitle || '', template: row.template, content })) ===
          JSON.stringify(canonical({ title: updated.title, eyebrow: updated.eyebrow, subtitle: updated.subtitle || '', template: updated.template, content: updated.content }))) continue;
      await conn.query('INSERT INTO section_revisions (section_key, snapshot) VALUES (?, ?)', [row.section_key, JSON.stringify({ title: row.title, eyebrow: row.eyebrow, subtitle: row.subtitle, is_visible: !!row.is_visible, content })]);
      await conn.query('UPDATE sections SET title = ?, eyebrow = ?, subtitle = ?, template = ?, content = ? WHERE section_key = ?',
        [updated.title, updated.eyebrow, updated.subtitle, updated.template, JSON.stringify(updated.content), row.section_key]);
    }
    await conn.query("UPDATE landing_pages SET content = JSON_SET(content, '$._presentation_version', 2) WHERE slug = 'welcome-bonus'");
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; }
};
