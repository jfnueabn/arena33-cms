const router = require('express').Router();
const controller = require('../controllers/public');

router.get('/', controller.show('home'));
router.get('/popular-games', controller.show('popular-games'));
router.get('/welcome-bonus', controller.show('welcome-bonus'));
router.get('/sports-betting', controller.show('sports-betting'));
router.get('/virtual-sports', controller.show('virtual-sports'));
router.get('/sports', controller.show('sports'));
router.get('/match-odds', controller.show('match-odds'));
router.get('/baccarat', controller.show('baccarat'));
router.get('/robots.txt', controller.robots);
router.get('/sitemap.xml', controller.sitemap);
router.get('/:locale(en|ms|zh)/:pageSlug?', (req, res, next) => controller.show(req.params.pageSlug || 'home')(req, res, next));
router.get('/:pageSlug', (req,res,next)=>require('../services/page-slug')(req.params.pageSlug)?controller.show(req.params.pageSlug)(req,res,next):next());

module.exports = router;
