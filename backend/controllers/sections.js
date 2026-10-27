const db = require('../db');
const { saveRevision } = require('../services/section-revisions');

exports.update = async (req, res, next) => {
  try {
    const current = await db.getSection(req.params.key, req.params.slug, req.locale || 'en');
    if (!current) return res.status(404).json({ error: 'Unknown section' });
    const { eyebrow = '', title = '', subtitle = '', is_visible = true, content } = req.body;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ error: 'content must be an object' });
    }
    const shape = require('../services/section-library').find(s => s.template === current.template) || require('../db/landing-section-defaults').find(s => s.section_key === current.section_key);
    if (current.template === 'builder_section' && !require('../services/content-blocks').valid(content)) return res.status(400).json({error:'Invalid content blocks. Choose a supported content type and keep table rows aligned.'});
    if (current.template === 'builder_table' && !require('../utils/table-content').valid(content)) return res.status(400).json({error:'Tables require 1–12 columns and up to 200 rows, with one text cell per column.'});
    if (shape && current.template !== 'builder_section' && !matchesShape(content, shape.content)) return res.status(400).json({ error: 'Invalid section content' });
    if (current.template==='builder_section' && is_visible && !(await singleMainHeading(current,content))) return res.status(400).json({error:'Only one visible H1 heading is allowed on the page. Change the additional heading to H2 or hide the other section.'});
    if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 80)) return res.status(400).json({error:'Section name must be between 1 and 80 characters.'});
    await saveRevision(current, req.session.admin.id, req.locale || 'en');
    if (typeof req.body.name === 'string' && req.body.name.trim() !== current.name) await db.pool.query('UPDATE sections SET name=? WHERE section_key=?',[req.body.name.trim(),current.section_key]);
    await db.pool.query(
      'UPDATE sections SET eyebrow = ?, title = ?, subtitle = ?, is_visible = ?, content = ?, updated_by = ? WHERE section_key = ?',
      [String(eyebrow).slice(0, 120), String(title).slice(0, 255), String(subtitle), is_visible ? 1 : 0, JSON.stringify(content), req.session.admin.id, current.section_key]
    );
    const translation = await require('../services/automatic-translations').syncSection(current.section_key);
    res.json({ section: await db.getSection(current.section_key, undefined, 'en'), translation });
  } catch (err) { next(err); }
};

exports.reorder = async (req, res, next) => {
  const slug = req.params.slug || 'home';
  const order = req.body.order;
  let conn;
  try {
    if (!(await db.getPage(slug))) return res.status(404).json({ error: 'Page not found' });
    const current = (await db.getSections(slug)).filter(s => !s.is_fixed);
    if (!Array.isArray(order) || order.length !== current.length || new Set(order).size !== order.length || order.some(key => !current.some(s => s.section_key === key))) {
      return res.status(400).json({ error: 'Order must contain each section on this page exactly once' });
    }
    conn = await db.pool.getConnection();
    await conn.beginTransaction();
    for (const [i, key] of order.entries()) {
      await conn.query('UPDATE sections SET sort_order = ? WHERE section_key = ? AND page_slug = ? AND is_fixed = 0', [(i + 1) * 10, String(key), slug]);
    }
    await conn.commit();
    res.json({ sections: await db.getSections(null, req.locale || 'en') });
  } catch (err) {
    if (conn) await conn.rollback();
    next(err);
  } finally {
    if (conn) conn.release();
  }
};

exports.revisions = async (req, res, next) => {
  try {
    if (!(await db.getSection(req.params.key, req.params.slug, req.locale || 'en'))) return res.status(404).json({ error: 'Unknown section' });
    const [rows] = await db.pool.query(
      `SELECT r.id, r.created_at, a.username FROM section_revisions r
       LEFT JOIN admins a ON a.id = r.admin_id
       WHERE r.section_key = ? AND r.locale = ? ORDER BY r.id DESC LIMIT 20`,
      [req.params.key, req.locale || 'en']
    );
    res.json({ revisions: rows });
  } catch (err) { next(err); }
};

exports.restore = async (req, res, next) => {
  try {
    const current = await db.getSection(req.params.key, req.params.slug, req.locale || 'en');
    if (!current) return res.status(404).json({ error: 'Unknown section' });
    const [rows] = await db.pool.query('SELECT snapshot FROM section_revisions WHERE id = ? AND section_key = ? AND locale = ?', [req.params.id, req.params.key, req.locale || 'en']);
    if (!rows[0]) return res.status(404).json({ error: 'Revision not found' });
    const snap = db.parseJson(rows[0].snapshot);
    if(current.template==='builder_section' && snap.is_visible && !(await singleMainHeading(current,snap.content))) return res.status(400).json({error:'This version would add a second H1. Hide the other H1 section before restoring.'});
    await saveRevision(current, req.session.admin.id, req.locale || 'en');
    await db.pool.query(
      'UPDATE sections SET eyebrow = ?, title = ?, subtitle = ?, is_visible = ?, content = ?, updated_by = ? WHERE section_key = ?',
      [snap.eyebrow, snap.title, snap.subtitle, snap.is_visible ? 1 : 0, JSON.stringify(snap.content), req.session.admin.id, req.params.key]
    );
    const translation = await require('../services/automatic-translations').syncSection(req.params.key);
    res.json({ section: await db.getSection(req.params.key, undefined, 'en'), translation });
  } catch (err) { next(err); }
};

function matchesShape(value, shape) {
  if (Array.isArray(shape)) return Array.isArray(value) && value.every(item => shape.length ? matchesShape(item, shape[0]) : typeof item === 'string');
  if (shape && typeof shape === 'object') return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(shape).every(k => matchesShape(value[k], shape[k]));
  return typeof value === typeof shape;
}


async function singleMainHeading(current,content) {
  const own=(content.blocks||[]).filter(block=>block.type==='heading'&&block.content.level==='h1').length;
  if(own>1)return false;if(!own)return true;
  const others=(await db.getSections(current.page_slug,'en')).filter(section=>section.section_key!==current.section_key&&!section.is_fixed&&section.is_visible);
  return !others.some(section=>section.template==='hero'||section.template==='games_hero'||section.template==='bonus_hero'||section.template==='sports_hero'||section.content.blocks?.some(block=>block.type==='heading'&&block.content.level==='h1'));
}
