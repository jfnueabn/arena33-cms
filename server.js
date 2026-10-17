require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./db');
const dbConfig = require('./db/config');
const defaults = require('./db/defaults');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SETTING_KEYS = Object.keys(defaults.settings);

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

// Render (and most hosts) sit behind a proxy; needed for secure cookies and req.ip.
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');
app.use(express.json({ limit: '300kb' }));
app.use(express.urlencoded({ extended: false }));
// redirect:false so `/admin` reaches the dashboard route instead of redirecting to the public/admin/ folder.
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', redirect: false }));

app.use(session({
  name: 'arena33.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  store: new MySQLStore({ ...dbConfig.connection, database: dbConfig.dbName, createDatabaseTable: true }),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600e3 }
}));

// ---------- View helpers ----------
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Only allow safe link targets so an admin typo (or a stolen session) can't inject `javascript:` URLs.
const safeUrl = u => {
  const s = String(u ?? '').trim();
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(s) ? s : '#';
};

// Wrap the highlighted phrase of a headline in <em>, escaping everything else.
const highlight = (title, phrase) => {
  const t = String(title ?? '');
  const i = phrase ? t.indexOf(phrase) : -1;
  if (i < 0) return escapeHtml(t);
  return escapeHtml(t.slice(0, i)) + '<em>' + escapeHtml(phrase) + '</em>' + escapeHtml(t.slice(i + phrase.length));
};

// Make sure the SEO canonical always ends with a slash so sitemap URLs join cleanly.
const siteUrl = settings => (settings.canonical_url || `http://localhost:${PORT}/`).replace(/\/?$/, '/');

app.locals.safeUrl = safeUrl;
app.locals.highlight = highlight;

// ---------- Public pages ----------
app.get('/', async (req, res, next) => {
  try {
    const [settings, sections] = await Promise.all([db.getSettings(), db.getSections()]);
    const byKey = Object.fromEntries(sections.map(s => [s.section_key, s]));
    const now = Date.now();
    const body = sections.filter(s => {
      if (s.is_fixed || !s.is_visible) return false;
      // Promos with an expiry date hide themselves automatically.
      if (s.section_key === 'promo' && s.content.expires_at && Date.parse(s.content.expires_at) < now) return false;
      return true;
    });
    const faq = body.find(s => s.section_key === 'faq');
    res.render('index', {
      settings,
      canonical: siteUrl(settings),
      header: byKey.header,
      footer: byKey.footer,
      sections: body,
      faqItems: faq ? faq.content.items : [],
      year: new Date().getFullYear()
    });
  } catch (err) { next(err); }
});

app.get('/robots.txt', async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    const allow = settings.robots_index === '1';
    res.type('text/plain').send(
      `User-agent: *\n${allow ? 'Allow: /' : 'Disallow: /'}\nDisallow: /admin\n\nSitemap: ${siteUrl(settings)}sitemap.xml\n`
    );
  } catch (err) { next(err); }
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const settings = await db.getSettings();
    const [[row]] = await db.pool.query('SELECT MAX(updated_at) AS last FROM sections');
    const lastmod = (row.last ? new Date(row.last) : new Date()).toISOString().slice(0, 10);
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url><loc>${escapeHtml(siteUrl(settings))}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`
    );
  } catch (err) { next(err); }
});

// ---------- Admin auth ----------
const loginAttempts = new Map(); // ip -> { count, until }
const LOCK_AFTER = 5, LOCK_MS = 10 * 60e3;

const requireAdminPage = (req, res, next) => (req.session.admin ? next() : res.redirect('/admin/login'));
const requireAdminApi = (req, res, next) => {
  if (!req.session.admin) return res.status(401).json({ error: 'Not logged in' });
  // CSRF guard on top of SameSite=strict: browsers won't send this header cross-site without CORS.
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'fetch') return res.status(403).json({ error: 'Bad request origin' });
  next();
};

app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null, username: '' });
});

app.post('/admin/login', async (req, res, next) => {
  try {
    const ip = req.ip;
    const rec = loginAttempts.get(ip);
    if (rec && rec.until > Date.now()) {
      return res.status(429).render('admin/login', { error: 'Too many attempts. Try again in a few minutes.', username: '' });
    }
    const { username = '', password = '' } = req.body;
    const [rows] = await db.pool.query('SELECT id, username, password_hash FROM admins WHERE username = ?', [username]);
    const ok = rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
    if (!ok) {
      const count = (rec?.count || 0) + 1;
      loginAttempts.set(ip, { count, until: count >= LOCK_AFTER ? Date.now() + LOCK_MS : 0 });
      return res.status(401).render('admin/login', { error: 'Wrong username or password.', username });
    }
    loginAttempts.delete(ip);
    await db.pool.query('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [rows[0].id]);
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.admin = { id: rows[0].id, username: rows[0].username };
      res.redirect('/admin');
    });
  } catch (err) { next(err); }
});

app.post('/admin/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

app.get('/admin', requireAdminPage, (req, res) => res.render('admin/dashboard', { admin: req.session.admin }));

// ---------- Admin API ----------
const api = express.Router();
api.use(requireAdminApi);

api.get('/bootstrap', async (req, res, next) => {
  try {
    const [settings, sections] = await Promise.all([db.getSettings(), db.getSections()]);
    res.json({
      admin: req.session.admin,
      settings,
      sections,
      defaults: Object.fromEntries(defaults.sections.map(s => [s.section_key, s.content]))
    });
  } catch (err) { next(err); }
});

api.put('/settings', async (req, res, next) => {
  try {
    const input = req.body.settings || {};
    for (const key of SETTING_KEYS) {
      if (key in input) {
        await db.pool.query(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
          [key, String(input[key]).slice(0, 2000)]
        );
      }
    }
    res.json({ settings: await db.getSettings() });
  } catch (err) { next(err); }
});

api.put('/sections/:key', async (req, res, next) => {
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
});

api.put('/sections-order', async (req, res, next) => {
  const order = Array.isArray(req.body.order) ? req.body.order : [];
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [i, key] of order.entries()) {
      await conn.query('UPDATE sections SET sort_order = ? WHERE section_key = ? AND is_fixed = 0', [(i + 1) * 10, String(key)]);
    }
    await conn.commit();
    res.json({ sections: await db.getSections() });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

api.get('/sections/:key/revisions', async (req, res, next) => {
  try {
    const [rows] = await db.pool.query(
      `SELECT r.id, r.created_at, a.username FROM section_revisions r
       LEFT JOIN admins a ON a.id = r.admin_id
       WHERE r.section_key = ? ORDER BY r.id DESC LIMIT 20`,
      [req.params.key]
    );
    res.json({ revisions: rows });
  } catch (err) { next(err); }
});

api.post('/sections/:key/revisions/:id/restore', async (req, res, next) => {
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
});

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'public', 'uploads'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // SVG is deliberately excluded: it can carry scripts.
    const ok = /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype) && /\.(png|jpe?g|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only PNG, JPG, WEBP or GIF images up to 2 MB'), ok);
  }
});

api.post('/upload', (req, res) => {
  upload.single('file')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

api.put('/password', async (req, res, next) => {
  try {
    const { current = '', next: nextPw = '' } = req.body;
    if (nextPw.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const [rows] = await db.pool.query('SELECT password_hash FROM admins WHERE id = ?', [req.session.admin.id]);
    if (!rows[0] || !(await bcrypt.compare(current, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Current password is wrong' });
    }
    await db.pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [await bcrypt.hash(nextPw, 12), req.session.admin.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

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

app.use('/api/admin', api);

// ---------- Errors ----------
app.use((req, res) => res.status(404).type('text/plain').send('Page not found'));
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Server error' });
  res.status(500).type('text/plain').send('Something went wrong. Check that MySQL is running and `npm run db:setup` has been run.');
});

app.listen(PORT, () => console.log(`Arena33 running → http://localhost:${PORT}  (admin: /admin)`));
