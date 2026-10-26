const db = require('../db');
const bcrypt = require('bcryptjs');

exports.update = async (req, res, next) => {
  try {
    const { current = '', next: nextPw = '' } = req.body;
    if (nextPw.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const [rows] = await db.pool.query('SELECT password_hash FROM admins WHERE id = ?', [req.session.admin.id]);
    if (!rows[0] || !(await bcrypt.compare(current, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Current password is wrong' });
    }
    await db.pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [await bcrypt.hash(nextPw, 12), req.session.admin.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};
