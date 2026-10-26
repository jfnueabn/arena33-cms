const { test } = require('node:test');
const assert = require('node:assert/strict');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const createApp = require('../app');
const db = require('../db');
const defaults = require('../db/defaults');

test('public pages, admin sessions and API protections survive route separation', async t => {
  const original = { query: db.pool.query, getSettings: db.getSettings, getSections: db.getSections, getSection: db.getSection, getConnection: db.pool.getConnection };
  const originalEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const passwordHash = await bcrypt.hash('test-password', 4);
  db.getSettings = async () => defaults.settings;
  db.getSections = async () => defaults.sections.map(s => ({ ...s, is_visible: true }));
  db.getSection = async () => null;
  db.pool.query = async sql => {
    if (sql.startsWith('SELECT id, username')) return [[{ id: 1, username: 'admin', password_hash: passwordHash }]];
    if (sql.startsWith('SELECT MAX')) return [[{ last: null }]];
    return [[]];
  };
  db.pool.getConnection = async () => { throw new Error('Test connection failure'); };
  const app = createApp({ sessionStore: new session.MemoryStore() });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    Object.assign(db, { getSettings: original.getSettings, getSections: original.getSections, getSection: original.getSection });
    db.pool.query = original.query;
    db.pool.getConnection = original.getConnection;
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
    await db.pool.end();
  });
  const request = (url, options = {}) => fetch(base + url, { redirect: 'manual', ...options });
  for (const url of ['/', '/robots.txt', '/sitemap.xml', '/admin/login', '/css/style.css']) {
    const res = await request(url);
    assert.equal(res.status, 200, url);
    await res.text();
  }
  assert.equal((await request('/missing')).status, 404);
  const admin = await request('/admin');
  assert.equal(admin.status, 302);
  assert.equal(admin.headers.get('location'), '/admin/login');
  const endpoints = [
    ['GET', '/bootstrap'], ['PUT', '/settings'],
    ['PUT', '/sections/hero'], ['PUT', '/sections-order'],
    ['GET', '/sections/hero/revisions'], ['POST', '/sections/hero/revisions/1/restore'],
    ['POST', '/upload'], ['PUT', '/password']
  ];
  for (const [method, url] of endpoints) {
    const res = await request('/api/admin' + url, { method });
    assert.equal(res.status, 401, url);
    assert.deepEqual(await res.json(), { error: 'Not logged in' });
  }
  const login = await request('/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'test-password' })
  });
  assert.equal(login.status, 302);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/admin/logins', { headers: { cookie } })).status, 404);
  const bootstrap = await (await request('/api/admin/bootstrap', { headers: { cookie } })).json();
  assert.equal('previousLogin' in bootstrap, false);
  assert.equal('failedSincePrevious' in bootstrap, false);
  assert.equal((await request('/admin', { headers: { cookie } })).status, 200);
  for (const [method, url] of endpoints.filter(([method]) => method !== 'GET')) {
    assert.equal((await request('/api/admin' + url, { method, headers: { cookie } })).status, 403, url);
  }
  for (const url of ['/bootstrap', '/sections/hero/revisions']) {
    assert.equal((await request('/api/admin' + url, { headers: { cookie } })).status, 200, url);
  }
  const write = (url, body, method = 'PUT') => request('/api/admin' + url, {
    method, headers: { cookie, 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
    body: JSON.stringify(body)
  });
  assert.equal((await write('/settings', { settings: {} })).status, 200);
  assert.equal((await write('/sections/unknown', { content: {} })).status, 404);
  assert.equal((await write('/sections/hero/revisions/1/restore', {}, 'POST')).status, 404);
  assert.equal((await write('/password', { next: 'short' })).status, 400);
  assert.equal((await write('/upload', {}, 'POST')).status, 400);
  const errorLog = console.error;
  try {
    console.error = () => {};
    const res = await write('/sections-order', { order: [] });
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'Server error' });
  } finally { console.error = errorLog; }
  assert.equal((await request('/admin/logout', { method: 'POST', headers: { cookie } })).status, 302);
  assert.equal((await request('/api/admin/bootstrap', { headers: { cookie } })).status, 401);
});
