const db = require('../db');
const bcrypt = require('bcryptjs');
const loginAttempts = new Map();
const LOCK_AFTER = 5, LOCK_MS = 10 * 60e3;

exports.showLogin = (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null, username: '' });
};

exports.login = async (req, res, next) => {
  try {
    const ip = req.ip;
    const { username = '', password = '' } = req.body;
    const rec = loginAttempts.get(ip);
    if (rec && rec.until > Date.now()) {
      return res.status(429).render('admin/login', { error: 'Too many attempts. Try again in a few minutes.', username: '' });
    }
    const [rows] = await db.pool.query('SELECT id, username, password_hash FROM admins WHERE username = ?', [username]);
    const admin = rows[0];
    const ok = admin && (await bcrypt.compare(password, admin.password_hash));
    if (!ok) {
      const count = (rec?.count || 0) + 1;
      loginAttempts.set(ip, { count, until: count >= LOCK_AFTER ? Date.now() + LOCK_MS : 0 });
      return res.status(401).render('admin/login', { error: 'Wrong username or password.', username });
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

exports.dashboard = (req, res) => res.render('admin/dashboard', { admin: req.session.admin });
