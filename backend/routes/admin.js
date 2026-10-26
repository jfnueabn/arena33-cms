const router = require('express').Router();
const controller = require('../controllers/auth');
const { requireAdminPage } = require('../middleware/auth');

router.get('/login', controller.showLogin);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/', requireAdminPage, controller.dashboard);

module.exports = router;
