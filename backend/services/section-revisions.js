const db = require('../db');

async function saveRevision(section, adminId) {
  const snapshot = { eyebrow: section.eyebrow, title: section.title, subtitle: section.subtitle, is_visible: section.is_visible, content: section.content };
  await db.pool.query('INSERT INTO section_revisions (section_key, snapshot, admin_id) VALUES (?, ?, ?)', [section.section_key, JSON.stringify(snapshot), adminId]);
  // Keep only the 20 newest snapshots per section.
  await db.pool.query(
    `DELETE FROM section_revisions WHERE section_key = ? AND id NOT IN (
       SELECT id FROM (SELECT id FROM section_revisions WHERE section_key = ? ORDER BY id DESC LIMIT 20) keep)`,
    [section.section_key, section.section_key]
  );
}

module.exports = { saveRevision };
