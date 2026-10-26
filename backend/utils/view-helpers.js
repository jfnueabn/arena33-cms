const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Only allow safe link targets so an admin typo (or a stolen session) can't inject `javascript:` URLs.
const safeUrl = u => {
  const s = String(u ?? '').trim();
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(s) ? s : '#';
};

// Wrap the highlighted phrase of a headline in <em>, escaping everything else.
const highlight = (title, phrase) => {
  const t = String(title ?? '');
  const i = phrase ? t.indexOf(phrase) : -1;
  if (i < 0) return escapeHtml(t);
  return escapeHtml(t.slice(0, i)) + '<em>' + escapeHtml(phrase) + '</em>' + escapeHtml(t.slice(i + phrase.length));
};

// Make sure the SEO canonical always ends with a slash so sitemap URLs join cleanly.
const siteUrl = settings => (settings.canonical_url || `http://localhost:${Number(process.env.PORT) || 3000}/`).replace(/\/?$/, '/');

module.exports = { escapeHtml, safeUrl, highlight, siteUrl };
