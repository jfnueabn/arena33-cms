const db = require('../db');
const { saveRevision } = require('../services/section-revisions');

exports.update = async (req, res, next) => {
  try {
    const current = await db.getSection(req.params.key);
    if (!current) return res.status(404).json({ error: 'Unknown section' });
    const { eyebrow = '', title = '', subtitle = '', is_visible = true, content } = req.body;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ error: 'content must be an object' });
    }
    await saveRevision(current, req.session.admin.id);
    await db.pool.query(
      'UPDATE sections SET eyebrow = ?, title = ?, subtitle = ?, is_visible = ?, content = ?, updated_by = ? WHERE section_key = ?',
      [String(eyebrow).slice(0, 120), String(title).slice(0, 255), String(subtitle), is_visible ? 1 : 0, JSON.stringify(content), req.session.admin.id, current.section_key]
    );
    res.json({ section: await db.getSection(current.section_key) });
  } catch (err) { next(err); }
};

exports.reorder = async (req, res, next) => {
  const order = Array.isArray(req.body.order) ? req.body.order : [];
  let conn;
  try {
    conn = await db.pool.getConnection();
    await conn.beginTransaction();
    for (const [i, key] of order.entries()) {
      await conn.query('UPDATE sections SET sort_order = ? WHERE section_key = ? AND is_fixed = 0', [(i + 1) * 10, String(key)]);
    }
    await conn.commit();
    res.json({ sections: await db.getSections() });
  } catch (err) {
    if (conn) await conn.rollback();
    next(err);
  } finally {
    if (conn) conn.release();
  }
};

exports.revisions = async (req, res, next) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT r.id, r.created_at, a.username FROM section_revisions r
       LEFT JOIN admins a ON a.id = r.admin_id
       WHERE r.section_key = ? ORDER BY r.id DESC LIMIT 20`,
      [req.params.key]
    );
    res.json({ revisions: rows });
  } catch (err) { next(err); }
};

exports.restore = async (req, res, next) => {
  try {
    const [rows] = await db.pool.query('SELECT snapshot FROM section_revisions WHERE id = ? AND section_key = ?', [req.params.id, req.params.key]);
    if (!rows[0]) return res.status(404).json({ error: 'Revision not found' });
    const snap = db.parseJson(rows[0].snapshot);
    const current = await db.getSection(req.params.key);
    await saveRevision(current, req.session.admin.id);
    await db.pool.query(
      'UPDATE sections SET eyebrow = ?, title = ?, subtitle = ?, is_visible = ?, content = ?, updated_by = ? WHERE section_key = ?',
      [snap.eyebrow, snap.title, snap.subtitle, snap.is_visible ? 1 : 0, JSON.stringify(snap.content), req.session.admin.id, req.params.key]
    );
    res.json({ section: await db.getSection(req.params.key) });
  } catch (err) { next(err); }
};
