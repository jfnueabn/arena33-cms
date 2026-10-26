const router = require('express').Router();
const controller = require('../controllers/public');

router.get('/', controller.home);
router.get('/robots.txt', controller.robots);
router.get('/sitemap.xml', controller.sitemap);

module.exports = router;
