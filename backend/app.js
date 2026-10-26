require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const express = require('express');
const createSession = require('./config/session');
const { safeUrl, highlight } = require('./utils/view-helpers');
const { notFound, handleError } = require('./middleware/errors');
const assetUrl = require('./utils/asset-url');

module.exports = function createApp({ sessionStore } = {}) {
  const app = express();
  // Hosts such as Render sit behind a proxy; needed for secure cookies and req.ip.
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.disable('x-powered-by');
  app.use(express.json({ limit: '300kb' }));
  app.use(express.urlencoded({ extended: false }));
  // Let /admin reach its page route instead of redirecting to public/admin/.
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', redirect: false }));
  app.use(createSession(sessionStore));
  app.locals.safeUrl = safeUrl;
  app.locals.highlight = highlight;
  app.locals.assetUrl = assetUrl;
  app.use('/', require('./routes/public'));
  app.use('/admin', require('./routes/admin'));
  app.use('/api/admin', require('./routes/admin-api'));
  app.use(notFound);
  app.use(handleError);
  return app;
};
