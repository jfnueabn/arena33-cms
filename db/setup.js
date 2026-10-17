// Creates the database + tables and seeds default content and the first admin.
//   npm run db:setup          -> create what is missing, keep existing data
//   npm run db:setup -- --reset -> drop CMS tables and reseed from db/defaults.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const defaults = require('./defaults');
const { connection, dbName } = require('./config');

(async () => {
  const reset = process.argv.includes('--reset');
  if (!/^\w+$/.test(dbName)) throw new Error('DB_NAME may only contain letters, numbers and underscores');

  const conn = await mysql.createConnection({ ...connection, multipleStatements: true, charset: 'utf8mb4' });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${dbName}\``);

  if (reset) {
    await conn.query('DROP TABLE IF EXISTS section_revisions, sections, settings, admins');
    console.log('• Dropped existing CMS tables');
  }

  await conn.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  console.log('• Tables ready');

  for (const [key, value] of Object.entries(defaults.settings)) {
    await conn.query('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
  }
  for (const [i, s] of defaults.sections.entries()) {
    await conn.query(
      `INSERT IGNORE INTO sections (section_key, name, eyebrow, title, subtitle, content, is_fixed, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.section_key, s.name, s.eyebrow, s.title, s.subtitle, JSON.stringify(s.content), s.is_fixed ? 1 : 0, (i + 1) * 10]
    );
  }
  console.log('• Default settings and sections seeded');

  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM admins');
  if (n === 0) {
    const user = process.env.ADMIN_USERNAME;
    const pass = process.env.ADMIN_PASSWORD;
    if (!user || !pass || pass.length < 8) {
      throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD (min 8 chars) in .env to create the first admin');
    }
    await conn.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [user, await bcrypt.hash(pass, 12)]);
    console.log(`• Admin "${user}" created`);
  }

  await conn.end();
  console.log(`✔ Database "${dbName}" is ready`);
})().catch(err => {
  console.error('✖ Setup failed:', err.message);
  process.exit(1);
});
