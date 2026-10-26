const requireAdminPage = (req, res, next) => (req.session.admin ? next() : res.redirect('/admin/login'));
const requireAdminApi = (req, res, next) => {
  if (!req.session.admin) return res.status(401).json({ error: 'Not logged in' });
  // CSRF guard on top of SameSite=strict: browsers won't send this header cross-site without CORS.
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'fetch') return res.status(403).json({ error: 'Bad request origin' });
  next();
};

module.exports = { requireAdminPage, requireAdminApi };
