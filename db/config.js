// Shared MySQL connection settings (app pool, session store and setup script).
// Hosted MySQL such as Aiven requires SSL: set DB_SSL=true and paste the
// provider's CA certificate into DB_CA_CERT so the server identity is verified.

function sslOptions() {
  if (process.env.DB_SSL !== 'true') return undefined;
  const ca = process.env.DB_CA_CERT;
  if (ca) return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true };
  console.warn('⚠ DB_SSL is on but DB_CA_CERT is empty: the connection is encrypted but the server certificate is not verified.');
  return { rejectUnauthorized: false };
}

const connection = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl: sslOptions()
};

const dbName = process.env.DB_NAME || 'arena33';

module.exports = { connection, dbName };
