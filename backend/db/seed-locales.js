const dictionary = { ...require('../utils/ui-translations').entries, ...require('./translations.json') };
Object.assign(dictionary, {
  Basic: ['Asas', '基础'], Elite: ['Elit', '精英'], 'per month': ['sebulan', '每月'],
  'Arena33 – Malaysia’s #1 Fantasy Football & Esports Hub | Join Free': ['Arena33 — Bola Sepak Fantasi & Esukan Malaysia', 'Arena33 — 马来西亚梦幻足球与电竞社区']
});
function translate(value, locale, key = '', parent = null) {
  if (typeof value === 'string') {
    if (['url', 'image', 'og_image', 'anchor', 'target_date', 'expires_at', 'color_from', 'color_to', 'contact_email'].includes(key)) return value;
    if (value === 'Home' && key === 'label' && parent && /^\d/.test(parent.value)) return locale === 'ms' ? 'Tuan rumah' : '主队';
    return dictionary[value]?.[locale === 'ms' ? 0 : 1] || value;
  }
  if (Array.isArray(value)) return value.map(item => translate(item, locale, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v, locale, k, value)]));
  return value;
}
const pageSeo = {
  home: {
    ms: ['Arena33 — Bola Sepak Fantasi & Esukan Malaysia', 'Bina pasukan fantasi Liga Super dan EPL, terokai esukan, sertai komuniti Arena33 dan ketahui ganjaran serta kejohanan.'],
    zh: ['Arena33 — 马来西亚梦幻足球与电竞社区', '组建马超与英超梦幻阵容，探索电竞项目，加入 Arena33 社区，了解奖励与赛事信息。']
  },
  'popular-games': {
    ms: ['Permainan Popular | Arena33 Malaysia', 'Terokai koleksi permainan Arena33. Layari kategori, ketahui gaya permainan dan cari permainan kegemaran anda.'],
    zh: ['热门游戏 | Arena33 马来西亚', '探索 Arena33 游戏精选，按类别浏览不同玩法，发现感兴趣的热门游戏。']
  },
  'welcome-bonus': {
    ms: ['Bonus Selamat Datang & Tawaran Ahli | Arena33', 'Ketahui tawaran alu-aluan Arena33, semak kelayakan dan baca syarat bonus sebelum memilih tawaran.'],
    zh: ['迎新优惠与会员礼遇 | Arena33', '了解 Arena33 迎新优惠，确认资格并阅读奖励条款，再选择合适的会员优惠。']
  },
  'sports-betting': {
    ms: ['Panduan Pertaruhan Sukan Malaysia | Arena33', 'Terokai bola sepak, badminton dan esukan. Fahami jenis pasaran serta maklumat sukan di Arena33.'],
    zh: ['体育博彩指南：足球、羽毛球与电竞 | Arena33', '探索体育类别，了解常见市场类型，阅读面向马来西亚体育爱好者的 Arena33 体育指南。']
  }
};
module.exports = async function seedLocales(conn) {
  await conn.beginTransaction();
  try {
    const [sections] = await conn.query('SELECT * FROM sections');
    const [pages] = await conn.query('SELECT * FROM landing_pages');
    for (const locale of ['ms', 'zh']) {
      for (const section of sections) {
        if (section.page_slug !== 'shared' && !pageSeo[section.page_slug]) continue;
        const content = typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
        await conn.query('INSERT IGNORE INTO section_translations (section_key, locale, title, eyebrow, subtitle, content) VALUES (?, ?, ?, ?, ?, ?)',
          [section.section_key, locale, translate(section.title, locale), translate(section.eyebrow, locale), translate(section.subtitle || '', locale), JSON.stringify(translate(content, locale))]);
      }
      for (const page of pages) {
        if (!pageSeo[page.slug]) continue;
        const content = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
        const [title, description] = pageSeo[page.slug]?.[locale] || [page.title, ''];
        const seo = { seo_title: title, seo_description: description, seo_keywords: title, og_image: content.og_image || '', robots_index: content.robots_index || '1' };
        await conn.query('INSERT IGNORE INTO page_translations (slug, locale, content) VALUES (?, ?, ?)', [page.slug, locale, JSON.stringify(seo)]);
      }
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; }
};
module.exports.translate = translate;
