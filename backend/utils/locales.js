const locales = [
  { code: 'en', html: 'en-MY', label: 'English' },
  { code: 'ms', html: 'ms-MY', label: 'Bahasa Melayu' },
  { code: 'zh', html: 'zh-Hans', label: '简体中文' }
];
const pageSlugs = ['home', 'popular-games', 'welcome-bonus', 'sports-betting', 'virtual-sports', 'sports', 'match-odds', 'baccarat'];
function pagePath(slug, locale = 'en') { return '/' + locale + '/' + (slug === 'home' ? '' : slug); }
function localizeUrl(url, locale) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return url;
  const match = url.match(/^\/(?:en|ms|zh)(?:\/|$)/);
  const rest = match ? '/' + url.slice(match[0].length) : url;
  const [pathname] = rest.split(/[?#]/);
  const slug = pathname.replace(/^\/|\/$/g, '') || 'home';
  return pageSlugs.includes(slug) ? '/' + locale + (rest === '/' ? '/' : rest) : url;
}
module.exports = { locales, pageSlugs, pagePath, localizeUrl };
