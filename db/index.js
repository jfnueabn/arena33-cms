const mysql = require('mysql2/promise');
const { connection, dbName } = require('./config');

const pool = mysql.createPool({
  ...connection,
  database: dbName,
  charset: 'utf8mb4',
  timezone: 'Z',
  connectionLimit: 10
});

// Store and read all times in UTC, whatever the MySQL server's own time zone is;
// the admin UI converts them to the viewer's local time.
pool.pool.on('connection', conn => conn.query("SET time_zone = '+00:00'"));

// MySQL returns JSON columns parsed; MariaDB returns them as strings.
const parseJson = v => (typeof v === 'string' ? JSON.parse(v) : v);

const toSection = r => ({
  section_key: r.section_key,
  name: r.name,
  eyebrow: r.eyebrow,
  title: r.title,
  subtitle: r.subtitle || '',
  content: parseJson(r.content),
  is_visible: !!r.is_visible,
  is_fixed: !!r.is_fixed,
  sort_order: r.sort_order,
  updated_at: r.updated_at
});

async function getSettings() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
  return Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
}

async function getSections() {
  const [rows] = await pool.query('SELECT * FROM sections ORDER BY sort_order, id');
  return rows.map(toSection);
}

async function getSection(key) {
  const [rows] = await pool.query('SELECT * FROM sections WHERE section_key = ?', [key]);
  return rows[0] ? toSection(rows[0]) : null;
}

module.exports = { pool, parseJson, getSettings, getSections, getSection };
