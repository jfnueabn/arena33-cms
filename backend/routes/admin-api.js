const router = require('express').Router();
const { requireAdminApi } = require('../middleware/auth');
const dashboard = require('../controllers/dashboard');
const settings = require('../controllers/settings');
const sections = require('../controllers/sections');
const uploads = require('../controllers/uploads');
const password = require('../controllers/password');

router.use(requireAdminApi);
router.get('/bootstrap', dashboard.bootstrap);
router.put('/settings', settings.update);
router.put('/sections/:key', sections.update);
router.put('/sections-order', sections.reorder);
router.get('/sections/:key/revisions', sections.revisions);
router.post('/sections/:key/revisions/:id/restore', sections.restore);
router.post('/upload', uploads.create);
router.put('/password', password.update);

module.exports = router;
