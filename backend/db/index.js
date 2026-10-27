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
const latestUpdate = row => row.translated_updated_at && row.updated_at
  ? new Date(Math.max(new Date(row.translated_updated_at).getTime(), new Date(row.updated_at).getTime()))
  : row.translated_updated_at || row.updated_at;

const contentDefaults = require('../utils/content-defaults');
const {hash, sectionSource} = require('../utils/translation-source');
function toSection(r, locale = 'en') {
  const shape = require('../services/section-library').find(s => s.template === r.template)?.content || require('./landing-section-defaults').find(s => s.section_key === r.section_key)?.content || {};
  const normalize = value => r.template === 'builder_table' ? require('../utils/table-content').normalize(value) : value;
  const englishContent = contentDefaults(normalize(parseJson(r.content)),shape);
  const source = {title:r.title,eyebrow:r.eyebrow,subtitle:r.subtitle || '',content:englishContent};
  const valid = locale !== 'en' && r.translated_content && r.translation_source_hash === hash(source);
  return {
    section_key:r.section_key, page_slug:r.page_slug, template:r.template || r.section_key, name:r.name,
    title:valid ? r.translated_title : r.title, eyebrow:valid ? r.translated_eyebrow : r.eyebrow,
    subtitle:(valid ? r.translated_subtitle : r.subtitle) || '',
    content:valid ? contentDefaults(normalize(parseJson(r.translated_content)),shape) : englishContent,
    locale, translation_exists:locale === 'en' || !!valid,
    is_visible:!!r.is_visible, is_fixed:!!r.is_fixed, sort_order:r.sort_order,
    updated_at:latestUpdate(r)
  };
}

async function getSettings() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
  return Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
}

async function getSections(pageSlug = 'home', locale = 'en') {
  const query = `SELECT s.*, t.title AS translated_title, t.eyebrow AS translated_eyebrow,
    t.subtitle AS translated_subtitle, t.content AS translated_content, t.updated_at AS translated_updated_at, t.source_hash AS translation_source_hash FROM sections s
    LEFT JOIN section_translations t ON t.section_key = s.section_key AND t.locale = ?`;
  const [rows] = await pool.query(query + " WHERE s.is_archived=0" + (pageSlug === null ? '' : " AND s.page_slug IN (?, 'shared')") + ' ORDER BY s.sort_order, s.id', pageSlug === null ? [locale] : [locale, pageSlug]);
  return rows.map(row => toSection(row, locale));
}

async function getSection(key, pageSlug, locale = 'en') {
  const [rows] = await pool.query(`SELECT s.*, t.title AS translated_title, t.eyebrow AS translated_eyebrow,
    t.subtitle AS translated_subtitle, t.content AS translated_content, t.updated_at AS translated_updated_at, t.source_hash AS translation_source_hash FROM sections s LEFT JOIN section_translations t
    ON t.section_key = s.section_key AND t.locale = ? WHERE s.section_key = ? AND s.is_archived=0`, [locale, key]);
  if (!rows[0] || (pageSlug && rows[0].page_slug !== pageSlug)) return null;
  return toSection(rows[0], locale);
}

function toPage(row, locale = 'en') {
  const base = parseJson(row.content);
  const source = Object.fromEntries(['seo_title','seo_description','seo_keywords','og_image','robots_index'].map(k=>[k,base[k]||'']));
  const valid = locale !== 'en' && row.translated_content && row.translation_source_hash === hash(source);
  const content = valid ? parseJson(row.translated_content) : source;
  const names = { home: 'Homepage', 'popular-games': 'Popular Games', 'welcome-bonus': 'Welcome Bonus', 'sports-betting': 'Sports Betting', 'virtual-sports': 'Virtual Sports', 'sports': 'Sports', 'match-odds': 'Match Odds', 'baccarat': 'Baccarat' };
  return { slug: row.slug, name: names[row.slug] || row.title,
    title: row.title, locale, translation_exists: locale === 'en' || !!valid, is_visible: !!row.is_visible, updated_at: latestUpdate(row),
    content: Object.fromEntries(['seo_title', 'seo_description', 'seo_keywords', 'og_image', 'robots_index'].map(k => [k, content[k] || ''])) };
}

async function getPages(locale = 'en') {
  const [rows] = await pool.query('SELECT p.*, t.content AS translated_content, t.updated_at AS translated_updated_at, t.source_hash AS translation_source_hash FROM landing_pages p LEFT JOIN page_translations t ON t.slug = p.slug AND t.locale = ? ORDER BY p.slug', [locale]);
  return rows.map(row => toPage(row, locale));
}

async function getPage(slug, locale = 'en') {
  const [rows] = await pool.query('SELECT p.*, t.content AS translated_content, t.updated_at AS translated_updated_at, t.source_hash AS translation_source_hash FROM landing_pages p LEFT JOIN page_translations t ON t.slug = p.slug AND t.locale = ? WHERE p.slug = ?', [locale, slug]);
  return rows[0] ? toPage(rows[0], locale) : null;
}

module.exports = { pool, parseJson, getSettings, getSections, getSection, getPages, getPage };
