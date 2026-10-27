const router = require('express').Router();
const { requireAdminApi } = require('../middleware/auth');
const dashboard = require('../controllers/dashboard');
const settings = require('../controllers/settings');
const sections = require('../controllers/sections');
const uploads = require('../controllers/uploads');
const password = require('../controllers/password');

router.use(requireAdminApi);
router.use((req, res, next) => {
  req.locale = req.query.locale || 'en';
  if (!require('../utils/locales').locales.some(l => l.code === req.locale)) return res.status(400).json({ error: 'Unsupported language' });
  if (req.locale !== 'en' && req.method !== 'GET') return res.status(403).json({ error: 'Edit content in English. Other languages are generated automatically.' });
  next();
});
const builder = require('../controllers/section-builder');
router.get('/pages/:slug/section-builder', builder.list);
router.post('/pages/:slug/sections', builder.create);
router.delete('/pages/:slug/sections/:key', builder.archive);
router.post('/pages/:slug/sections/:key/unarchive', builder.restore);
router.put('/pages/:slug', require('../controllers/pages').update);
router.put('/pages/:slug/sections-order', sections.reorder);
router.put('/pages/:slug/sections/:key', sections.update);
router.get('/pages/:slug/sections/:key/revisions', sections.revisions);
router.post('/pages/:slug/sections/:key/revisions/:id/restore', sections.restore);
router.get('/bootstrap', dashboard.bootstrap);
router.post('/translations/sync', async (req,res,next) => {
  try {
    const service=require('../services/automatic-translations');
    const results=[];
    for (const page of await require('../db').getPages()) results.push(await service.syncPage(page.slug));
    for (const section of await require('../db').getSections(null)) results.push(await service.syncSection(section.section_key));
    res.json({status:results.every(r=>r.status==='complete')?'complete':'pending',pending:results.filter(r=>r.status!=='complete').length});
  } catch(error) { next(error); }
});
router.put('/settings', settings.update);
router.put('/sections/:key', sections.update);
router.put('/sections-order', sections.reorder);
router.get('/sections/:key/revisions', sections.revisions);
router.post('/sections/:key/revisions/:id/restore', sections.restore);
router.post('/upload', uploads.create);
router.put('/password', password.update);

module.exports = router;
