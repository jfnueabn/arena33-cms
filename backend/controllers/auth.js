const db = require('../db');
const bcrypt = require('bcryptjs');
const loginAttempts = new Map();
const LOCK_AFTER = 5, LOCK_MS = 10 * 60e3;

// Admin brand follows the site logo set under Header & navigation.
async function brand() {
  try {
    const header = await db.getSection('header', undefined, 'en');
    const { logo_text = '', logo_accent = '' } = header?.content || {};
    if (logo_text || logo_accent) return { text: logo_text, accent: logo_accent };
  } catch { /* fall back below */ }
  return { text: 'LV', accent: '55' };
}

exports.showLogin = async (req, res, next) => {
  try {
    if (req.session.admin) return res.redirect('/admin');
    res.render('admin/login', { error: null, username: '', brand: await brand() });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const ip = req.ip;
    const { username = '', password = '' } = req.body;
    const rec = loginAttempts.get(ip);
    if (rec && rec.until > Date.now()) {
      return res.status(429).render('admin/login', { error: 'Too many attempts. Try again in a few minutes.', username: '', brand: await brand() });
    }
    const [rows] = await db.pool.query('SELECT id, username, password_hash FROM admins WHERE username = ?', [username]);
    const admin = rows[0];
    const ok = admin && (await bcrypt.compare(password, admin.password_hash));
    if (!ok) {
      const count = (rec?.count || 0) + 1;
      loginAttempts.set(ip, { count, until: count >= LOCK_AFTER ? Date.now() + LOCK_MS : 0 });
      return res.status(401).render('admin/login', { error: 'Wrong username or password.', username, brand: await brand() });
    }
    loginAttempts.delete(ip);

    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.admin = { id: admin.id, username: admin.username };
      res.redirect('/admin');
    });
  } catch (err) { next(err); }
};

exports.logout = (req, res) => req.session.destroy(() => res.redirect('/admin/login'));

exports.dashboard = async (req, res, next) => {
  try { res.render('admin/dashboard', { admin: req.session.admin, brand: await brand() }); } catch (err) { next(err); }
};
