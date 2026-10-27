// Shared MySQL connection settings (app pool, session store and setup script).
// Hosted MySQL such as Aiven requires SSL: set DB_SSL=true and give the provider's
// CA certificate so the server identity is verified — either its contents in
// DB_CA_CERT (handy on Render) or a file path in DB_CA_CERT_PATH (handy locally).
const fs = require('fs');
const path = require('path');

function sslOptions() {
  if (process.env.DB_SSL !== 'true') return undefined;
  let ca = process.env.DB_CA_CERT;
  if (!ca && process.env.DB_CA_CERT_PATH) {
    ca = fs.readFileSync(path.resolve(__dirname, '..', '..', process.env.DB_CA_CERT_PATH), 'utf8');
  }
  if (ca) return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  console.warn('⚠ DB_SSL is on but no CA certificate is set: the connection is encrypted but the server certificate is not verified.');
  return { rejectUnauthorized: false };
}

const connection = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl: sslOptions()
};

const dbName = process.env.DB_NAME || 'lv55';

module.exports = { connection, dbName };
