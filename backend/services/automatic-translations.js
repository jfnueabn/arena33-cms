const db = require('../db');
const worker = require('./offline-worker');
const { hash, sectionSource } = require('../utils/translation-source');
const knownTranslation = require('../db/seed-locales').translate;
const excluded = new Set(['id','type','url','image','og_image','anchor','target_date','expires_at','color_from','color_to','contact_email','logo_text','logo_accent','robots_index']);

function shouldTranslate(text, key) {
  if (excluded.has(key) || !/[a-zA-Z]{2}/.test(text)) return false;
  if (/^(?:https?:|mailto:|tel:|\/|#)/.test(text) && key !== 'period') return false;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]+$/i.test(text) || /^(?:RM\s*)?[\d.,%×+–—\s]+$/i.test(text)) return false;
  return !/^(?:Arena33|Arena|MLBB|Dota 2|Valorant|EPL|ATP|WTA|NBA|FPX|VIP|GrabPay|Boost|ShopeePay|DuitNow|Maybank2u|CIMB Clicks|Touch [’']n Go)$/.test(text);
}

async function translateDocument(source, locale, provider = worker.translateBatch) {
  const output = JSON.parse(JSON.stringify(source));
  const entries = [];
  function walk(value, path = [], key = '', parent = null) {
    if (['layout','style','level','variant'].includes(key)) return;
    if (typeof value === 'string' && shouldTranslate(value,key)) {
      const known = knownTranslation(value,locale,key,parent);
      entries.push({text:value,path,known:known !== value ? known : null});
    }
    else if (Array.isArray(value)) value.forEach((v,i)=>walk(v,[...path,i],key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k,v])=>walk(v,[...path,k],k,value));
  }
  walk(source);
  const unique = [...new Set(entries.filter(e=>!e.known).map(e=>e.text))];
  const translated = new Map();
  const missing = [];
  for (const text of unique) {
    const known = knownTranslation(text,locale);
    if (known !== text) { translated.set(text,known); continue; }
    const [rows] = await db.pool.query('SELECT translated_text FROM translation_cache WHERE source_hash = ? AND locale = ?', [hash(text),locale]);
    if (rows[0]) translated.set(text,rows[0].translated_text); else missing.push(text);
  }
  for (let i=0;i<missing.length;i+=16) {
    const batch = missing.slice(i,i+16);
    const results = await provider(batch,locale);
    if (!Array.isArray(results) || results.length !== batch.length || results.some(s=>typeof s!=='string'||!s.trim())) throw new Error('The offline model returned an incomplete translation.');
    for (let n=0;n<batch.length;n++) {
      translated.set(batch[n],results[n]);
      await db.pool.query('INSERT INTO translation_cache (source_hash, locale, translated_text) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text)', [hash(batch[n]),locale,results[n]]);
    }
  }
  for (const entry of entries) {
    const parent = entry.path.slice(0,-1).reduce((obj,key)=>obj[key],output);
    parent[entry.path.at(-1)] = entry.known || translated.get(entry.text);
  }
  return output;
}

async function syncSection(key) {
  const section = await db.getSection(key,undefined,'en');
  const source = sectionSource(section), sourceHash = hash(source);
  try {
    for (const locale of ['ms','zh']) {
      const [existing] = await db.pool.query('SELECT source_hash FROM section_translations WHERE section_key = ? AND locale = ?', [key,locale]);
      if (existing[0]?.source_hash === sourceHash) continue;
      const translated = await translateDocument(source,locale);
      await db.pool.query('INSERT INTO section_translations (section_key, locale, title, eyebrow, subtitle, content, source_hash) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title),eyebrow=VALUES(eyebrow),subtitle=VALUES(subtitle),content=VALUES(content),source_hash=VALUES(source_hash)',
        [key,locale,translated.title.slice(0,255),translated.eyebrow.slice(0,120),translated.subtitle,JSON.stringify(translated.content),sourceHash]);
    }
    return {status:'complete'};
  } catch (error) { return {status:'pending',message:error.message}; }
}

async function syncPage(slug) {
  const page = await db.getPage(slug,'en'), sourceHash = hash(page.content);
  try {
    for (const locale of ['ms','zh']) {
      const [existing] = await db.pool.query('SELECT source_hash FROM page_translations WHERE slug = ? AND locale = ?', [slug,locale]);
      if (existing[0]?.source_hash === sourceHash) continue;
      const translated = await translateDocument(page.content,locale);
      await db.pool.query('INSERT INTO page_translations (slug,locale,content,source_hash) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE content=VALUES(content),source_hash=VALUES(source_hash)',[slug,locale,JSON.stringify(translated),sourceHash]);
    }
    return {status:'complete'};
  } catch(error) { return {status:'pending',message:error.message}; }
}
module.exports = {syncSection,syncPage,translateDocument,shouldTranslate};
