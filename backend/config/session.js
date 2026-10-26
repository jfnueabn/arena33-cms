const crypto = require('crypto');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const dbConfig = require('../db/config');

module.exports = function createSession(store) {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return session({
    name: 'arena33.sid',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    store: store || new MySQLStore({ ...dbConfig.connection, database: dbConfig.dbName, createDatabaseTable: true }),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600e3 }
  });
};
