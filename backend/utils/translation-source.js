const { createHash } = require('crypto');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const sectionSource = section => ({ title:section.title, eyebrow:section.eyebrow, subtitle:section.subtitle || '', content:section.content });
module.exports = { hash, sectionSource };
