const { test } = require('node:test');
const assert = require('node:assert/strict');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const createApp = require('../app');
const db = require('../db');
const defaults = require('../db/defaults');
const gameDefault = require('../db/popular-games');
const bonusDefault = require('../db/welcome-bonus');
const sportsDefault = require('../db/sports-betting');
const splitPage = require('../db/page-sections');
const clone = value => JSON.parse(JSON.stringify(value));

test('locale URLs keep page selection and leave assets, fragments and external links intact', () => {
  const {localizeUrl, pagePath} = require('../utils/locales');
  assert.equal(pagePath('home','ms'),'/ms/');
  assert.equal(localizeUrl('/sports-betting','zh'),'/zh/sports-betting');
  assert.equal(localizeUrl('/en/popular-games#game-collection','ms'),'/ms/popular-games#game-collection');
  assert.equal(localizeUrl('/#footer','zh'),'/zh/#footer');
  for (const value of ['/images/sports-arena.svg','#footer','https://example.com/login','mailto:test@example.com']) assert.equal(localizeUrl(value,'zh'),value);
});

test('new presentation fields preserve custom content and do not duplicate list entries', () => {
  const fill = require('../utils/content-defaults');
  const saved = { paragraphs: ['My saved text'], image: '/uploads/custom.png', rows: [{ offer: 'Custom offer', benefit: 'Custom benefit' }] };
  const result = fill(saved, { paragraphs: ['Default'], image: '/default.svg', detail_title: 'More information', rows: [{ offer: 'Example', benefit: 'Example', percentage: '100%' }] });
  assert.deepEqual(result.paragraphs, saved.paragraphs);
  assert.equal(result.image, saved.image);
  assert.equal(result.detail_title, 'More information');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].benefit, 'Custom benefit');
  assert.equal(result.rows[0].percentage, '');
});

test('legacy content splits into seven independent sections without changing saved content', () => {
  const page = clone(gameDefault);
  page.title = 'A saved headline';
  page.content.collection_description = 'A saved collection description';
  page.content.games[0].name = 'A saved game';
  page.content.providers = ['A saved provider'];
  const before = clone(page);
  const sections = splitPage(page);
  assert.equal(sections.length, 7);
  assert.equal(new Set(sections.map(s => s.section_key)).size, 7);
  assert.equal(sections[0].title, page.title);
  assert.equal(sections[1].subtitle, page.content.collection_description);
  assert.deepEqual(sections[1].content.games, page.content.games);
  assert.deepEqual(sections[3].content.providers, page.content.providers);
  assert.deepEqual(sections[5].content.items, page.content.faq);
  assert.deepEqual(page, before);
});

test('shared editor supports page SEO, isolated sections, ordering, visibility, history and preview', async t => {
  const autoService = require('../services/automatic-translations');
  const originalSyncSection = autoService.syncSection, originalSyncPage = autoService.syncPage;
  autoService.syncSection = async () => ({status:'complete'});
  autoService.syncPage = async () => ({status:'complete'});
  const originals = Object.fromEntries(['getSettings', 'getSections', 'getSection', 'getPages', 'getPage'].map(k => [k, db[k]]));
  const queryOriginal = db.pool.query, connectionOriginal = db.pool.getConnection;
  const environment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  let sections = [
    ...defaults.sections.map((s, i) => ({ ...clone(s), page_slug: s.is_fixed ? 'shared' : 'home', template: s.section_key, sort_order: i * 10, is_visible: true })),
    ...splitPage(clone(gameDefault)).map((s, i) => ({ ...s, sort_order: i * 10 })),
    ...clone(bonusDefault.sections).map((s, i) => ({ ...s, sort_order: i * 10 })),
    ...clone(sportsDefault.sections).map((s, i) => ({ ...s, sort_order: i * 10 }))
  ];
  const seo = source => Object.fromEntries(['seo_title', 'seo_description', 'seo_keywords', 'og_image', 'robots_index'].map(k => [k, source[k] || (k === 'robots_index' ? '1' : '')]));
  let pages = [{ slug: 'home', name: 'Homepage', title: 'Homepage', content: seo(defaults.settings), is_visible: true },
    { slug: 'popular-games', name: 'Popular Games', title: gameDefault.title, content: seo(gameDefault.content), is_visible: true },
    { slug: bonusDefault.slug, name: bonusDefault.name, title: bonusDefault.title, content: clone(bonusDefault.content), is_visible: true },
    { slug: sportsDefault.slug, name: sportsDefault.name, title: sportsDefault.title, content: clone(sportsDefault.content), is_visible: true }];
  const revisions = [];
  const translatedSections = new Map(), translatedPages = new Map();
  const localSection = (section, locale) => section ? {...clone(section), ...clone(translatedSections.get(locale + ':' + section.section_key) || {}), locale, translation_exists:locale === 'en' || translatedSections.has(locale + ':' + section.section_key)} : null;
  const localPage = (page, locale) => page ? {...clone(page), content:clone(translatedPages.get(locale + ':' + page.slug) || page.content), locale} : null;
  db.getSettings = async () => clone(defaults.settings);
  db.getSections = async (slug = 'home', locale = 'en') => sections.filter(s => slug === null || s.page_slug === slug || s.page_slug === 'shared').sort((a,b) => a.sort_order-b.sort_order).map(s => localSection(s,locale));
  db.getSection = async (key, slug, locale = 'en') => localSection(sections.find(s => s.section_key === key && (!slug || s.page_slug === slug)),locale);
  db.getPages = async (locale = 'en') => pages.map(p => localPage(p,locale));
  db.getPage = async (slug, locale = 'en') => localPage(pages.find(p => p.slug === slug),locale);
  const hash = await bcrypt.hash('test-password', 4);
  db.pool.query = async (sql, values = []) => {
    if (sql.startsWith('SELECT id, username')) return [[{ id: 1, username: 'admin', password_hash: hash }]];
    if (sql.startsWith('INSERT INTO section_revisions')) {
      revisions.push({ id: revisions.length + 1, section_key: values[0], snapshot: JSON.parse(values[1]), username: 'admin', locale:values[3] || 'en' });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT r.id')) return [revisions.filter(r => r.section_key === values[0] && r.locale === values[1])];
    if (sql.startsWith('SELECT snapshot')) return [revisions.filter(r => r.id === Number(values[0]) && r.section_key === values[1] && r.locale === values[2])];
    if (sql.startsWith('INSERT INTO section_translations')) { translatedSections.set(values[1]+':'+values[0], {title:values[2],eyebrow:values[3],subtitle:values[4],content:JSON.parse(values[5])}); return [{affectedRows:1}]; }
    if (sql.startsWith('UPDATE sections SET is_visible')) { sections.find(s => s.section_key === values[2]).is_visible = !!values[0]; return [{affectedRows:1}]; }
    if (sql.startsWith('INSERT INTO page_translations')) { translatedPages.set(values[1]+':'+values[0],JSON.parse(values[2])); return [{affectedRows:1}]; }
    if (sql.startsWith('UPDATE landing_pages SET is_visible')) { pages.find(p => p.slug === values[1]).is_visible=!!values[0];return [{affectedRows:1}]; }
    if (sql.startsWith('UPDATE sections SET eyebrow')) {
      const section = sections.find(s => s.section_key === values[6]);
      Object.assign(section, { eyebrow: values[0], title: values[1], subtitle: values[2], is_visible: !!values[3], content: JSON.parse(values[4]) });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE sections SET sort_order')) {
      sections.find(s => s.section_key === values[1] && s.page_slug === values[2]).sort_order = values[0];
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('UPDATE landing_pages')) {
      const page = pages.find(p => p.slug === values[6]);
      page.content = Object.fromEntries(['seo_title', 'seo_description', 'seo_keywords', 'og_image', 'robots_index'].map((k, i) => [k, values[i]]));
      page.is_visible = !!values[5];
      return [{ affectedRows: 1 }];
    }
    return [[]];
  };
  db.pool.getConnection = async () => ({ query: db.pool.query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} });
  const server = createApp({ sessionStore: new session.MemoryStore() }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    Object.assign(db, originals); autoService.syncSection = originalSyncSection; autoService.syncPage = originalSyncPage; db.pool.query = queryOriginal; db.pool.getConnection = connectionOriginal;
    if (environment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = environment;
    await db.pool.end();
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (url, options = {}) => fetch(base + url, { redirect: 'manual', ...options });
  for (const url of ['/', '/popular-games', '/welcome-bonus', '/sports-betting', '/robots.txt', '/sitemap.xml', '/admin/login', '/css/style.css']) {
    const res = await request(url); assert.equal(res.status, 200, url); await res.text();
  }
  assert.equal((await request('/admin')).status, 302);
  const endpoints = [ ['GET', '/bootstrap'], ['PUT', '/settings'], ['PUT', '/sections/header'],
    ['PUT', '/pages/home'], ['PUT', '/pages/popular-games'], ['PUT', '/pages/popular-games/sections/games_hero'],
    ['PUT', '/pages/popular-games/sections-order'], ['GET', '/pages/popular-games/sections/games_hero/revisions'],
    ['POST', '/pages/popular-games/sections/games_hero/revisions/1/restore'], ['POST', '/upload'], ['PUT', '/password'],
    ['PUT', '/pages/welcome-bonus'], ['PUT', '/pages/welcome-bonus/sections/bonus_offers'],
    ['PUT', '/pages/welcome-bonus/sections-order'], ['GET', '/pages/welcome-bonus/sections/bonus_offers/revisions'],
    ['PUT', '/pages/sports-betting'], ['PUT', '/pages/sports-betting/sections/sports_hero'], ['PUT', '/pages/sports-betting/sections-order'] ];
  for (const [method, url] of endpoints) assert.equal((await request('/api/admin' + url, { method })).status, 401, url);
  const login = await request('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'test-password' }) });
  assert.equal(login.status, 302);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const auth = { cookie };
  for (const [method, url] of endpoints.filter(([method]) => method !== 'GET')) assert.equal((await request('/api/admin' + url, { method, headers: auth })).status, 403, url);
  const write = (url, body, method = 'PUT') => request('/api/admin' + url, { method, headers: { cookie, 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, body: JSON.stringify(body) });
  const bootstrap = await (await request('/api/admin/bootstrap', { headers: auth })).json();
  assert.equal(bootstrap.pages.length, 4);
  assert.equal(bootstrap.sections.filter(s => s.page_slug === 'popular-games').length, 7);
  assert.equal((await request('/admin', { headers: auth })).status, 200);
  assert.equal((await request('/api/admin/logins', { headers: auth })).status, 404);
  const hero = await db.getSection('games_hero');
  assert.equal((await write('/pages/home/sections/games_hero', hero)).status, 404);
  assert.equal((await request('/api/admin/pages/home/sections/games_hero/revisions', { headers: auth })).status, 404);
  assert.equal((await write('/pages/popular-games/sections/games_collection', { ...await db.getSection('games_collection'), content: {} })).status, 400);
  assert.equal((await write('/pages/popular-games/sections/games_hero', { ...hero, title: 'An updated game headline' })).status, 200);
  let html = await (await request('/popular-games')).text();
  assert.match(html, /An updated game headline/);
  assert.doesNotMatch(await (await request('/')).text(), /An updated game headline/);
  const history = await (await request('/api/admin/pages/popular-games/sections/games_hero/revisions', { headers: auth })).json();
  assert.equal(history.revisions.length, 1);
  assert.equal((await write('/pages/home/sections/hero/revisions/1/restore', {}, 'POST')).status, 404);
  assert.equal((await write('/pages/popular-games/sections/games_hero/revisions/1/restore', {}, 'POST')).status, 200);
  assert.equal((await db.getSection('games_hero')).title, hero.title);
  const order = sections.filter(s => s.page_slug === 'popular-games').map(s => s.section_key).reverse();
  const homeOrder = sections.filter(s => s.page_slug === 'home').map(s => s.sort_order);
  assert.equal((await write('/pages/popular-games/sections-order', { order: ['hero'] })).status, 400);
  assert.equal((await write('/pages/popular-games/sections-order', { order })).status, 200);
  assert.deepEqual((await db.getSections('popular-games')).filter(s => !s.is_fixed).map(s => s.section_key), order);
  assert.deepEqual(sections.filter(s => s.page_slug === 'home').map(s => s.sort_order), homeOrder);
  const faq = await db.getSection('games_faq');
  assert.equal((await write('/pages/popular-games/sections/games_faq', { ...faq, is_visible: false })).status, 200);
  html = await (await request('/popular-games')).text(); assert.doesNotMatch(html, /FAQPage/);
  assert.equal((await write('/pages/popular-games/sections/games_faq', faq)).status, 200);
  const page = await db.getPage('popular-games');
  assert.equal((await write('/pages/popular-games', { ...page, content: { ...page.content, seo_title: 'Custom SEO title' } })).status, 200);
  html = await (await request('/popular-games')).text(); assert.match(html, /<title>Custom SEO title<\/title>/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1); assert.match(html, /FAQPage/); assert.match(html, /data-game-filter="Slots"/);
  assert.equal((await write('/pages/popular-games', { ...page, is_visible: false })).status, 200);
  assert.equal((await request('/popular-games')).status, 404);
  assert.equal((await request('/popular-games?preview=1')).status, 404);
  const preview = await request('/popular-games?preview=1', { headers: auth }); assert.equal(preview.status, 200);
  assert.match(await preview.text(), /content="noindex, nofollow"/);
  assert.doesNotMatch(await (await request('/sitemap.xml')).text(), /popular-games/);
  assert.equal((await write('/pages/popular-games', page)).status, 200);
  assert.match(await (await request('/sitemap.xml')).text(), /popular-games/);
  assert.equal(bootstrap.sections.filter(s => s.page_slug === 'welcome-bonus').length, 9);
  const offerSection = await db.getSection('bonus_offers');
  const offersDraft = clone(offerSection);
  offersDraft.content.offers[0].title = 'A customised member offer';
  assert.equal((await write('/pages/popular-games/sections/bonus_offers', offersDraft)).status, 404);
  assert.equal((await write('/pages/welcome-bonus/sections/bonus_offers', { ...offersDraft, content: { offers: 'invalid' } })).status, 400);
  assert.equal((await write('/pages/welcome-bonus/sections/bonus_offers', offersDraft)).status, 200);
  const offerHistory = await (await request('/api/admin/pages/welcome-bonus/sections/bonus_offers/revisions', { headers: auth })).json();
  assert.equal(offerHistory.revisions.length, 1);
  const bonusHtml = await (await request('/welcome-bonus')).text();
  assert.match(bonusHtml, /A customised member offer/);
  assert.match(bonusHtml, /href="#footer">Contact us/);
  assert.match(bonusHtml, /FAQPage/);
  assert.equal((bonusHtml.match(/<h1[ >]/g) || []).length, 1);
  assert.match(bonusHtml, /RM 588/);
  assert.match(bonusHtml, /Illustrative offer/);
  assert.match(bonusHtml, /No offer end date set/);
  assert.match(bonusHtml, /welcome-rewards.svg/);
  assert.equal((bonusHtml.match(/class="card bonus-offer"/g) || []).length, 6);
  const bonusHero = await db.getSection('bonus_hero');
  assert.equal((await write('/pages/welcome-bonus/sections/bonus_hero', { ...bonusHero, content: { ...bonusHero.content, target_date: '2030-12-31T23:59' } })).status, 200);
  assert.match(await (await request('/welcome-bonus')).text(), /data-target="2030-12-31T23:59"/);
  assert.doesNotMatch(await (await request('/popular-games')).text(), /A customised member offer/);
  const bonusPage = await db.getPage('welcome-bonus');
  assert.equal((await write('/pages/welcome-bonus', { ...bonusPage, is_visible: false })).status, 200);
  assert.equal((await request('/welcome-bonus')).status, 404);
  assert.doesNotMatch(await (await request('/sitemap.xml')).text(), /welcome-bonus/);
  assert.equal((await request('/welcome-bonus?preview=1', { headers: auth })).status, 200);
  assert.equal((await write('/pages/welcome-bonus', bonusPage)).status, 200);
  assert.match(await (await request('/sitemap.xml')).text(), /welcome-bonus/);
  assert.equal(bootstrap.sections.filter(s => s.page_slug === 'sports-betting').length, 9);
  const sportsHero = await db.getSection('sports_hero');
  assert.equal((await write('/pages/home/sections/sports_hero', sportsHero)).status, 404);
  assert.equal((await write('/pages/sports-betting/sections/sports_hero', { ...sportsHero, content: { matches: [] } })).status, 400);
  assert.equal((await write('/pages/sports-betting/sections/sports_hero', { ...sportsHero, title: 'Sports information updated' })).status, 200);
  const sportsHtml = await (await request('/sports-betting')).text();
  assert.match(sportsHtml, /Sports information updated/);
  assert.match(sportsHtml, /Illustrative scores and odds/);
  assert.match(sportsHtml, /href="#footer">Contact us/);
  assert.match(sportsHtml, /FAQPage/);
  assert.equal((sportsHtml.match(/<h1[ >]/g) || []).length, 1);
  assert.equal((sportsHtml.match(/class="card sports-category"/g) || []).length, 6);
  assert.doesNotMatch(await (await request('/welcome-bonus')).text(), /Sports information updated/);
  const sportsPage = await db.getPage('sports-betting');
  assert.equal((await write('/pages/sports-betting', { ...sportsPage, is_visible: false })).status, 200);
  assert.equal((await request('/sports-betting')).status, 404);
  assert.doesNotMatch(await (await request('/sitemap.xml')).text(), /sports-betting/);
  assert.equal((await request('/sports-betting?preview=1', { headers: auth })).status, 200);
  assert.equal((await write('/pages/sports-betting', sportsPage)).status, 200);
  assert.match(await (await request('/sitemap.xml')).text(), /sports-betting/);
  const englishHero = await db.getSection('sports_hero');
  for (const language of ['ms','zh']) {
    assert.equal((await write('/pages/sports-betting/sections/sports_hero?locale='+language,{...englishHero,title:'Do not save this'})).status,403);
    assert.equal((await write('/pages/sports-betting?locale='+language,sportsPage)).status,403);
    assert.equal((await request('/api/admin/bootstrap?locale='+language,{headers:auth})).status,200);
    const html = await (await request('/'+language+'/sports-betting')).text();
    assert.match(html,new RegExp('<html lang="'+(language === 'ms' ? 'ms-MY' : 'zh-Hans')+'"'));
    assert.match(html,/hreflang="ms-MY"/);
  }
  assert.equal((await db.getSection('sports_hero')).title,englishHero.title);
  assert.equal((await request('/api/admin/bootstrap?locale=xx',{headers:auth})).status,400);
  assert.equal((await request('/fr/sports-betting')).status,404);
  assert.equal((await write('/password', { next: 'short' })).status, 400);
  assert.equal((await request('/admin/logout', { method: 'POST', headers: auth })).status, 302);
  assert.equal((await request('/api/admin/bootstrap', { headers: auth })).status, 401);
});
