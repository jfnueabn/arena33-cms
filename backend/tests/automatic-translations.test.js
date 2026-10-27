const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hash, sectionSource } = require('../utils/translation-source');
const db = require('../db');
test('source fingerprints ignore layout but detect edited text', () => {
  const section = {title:'Hello',eyebrow:'',subtitle:'',content:{a:'Text'},sort_order:10};
  assert.equal(hash(sectionSource(section)),hash(sectionSource({...section,sort_order:20})));
  assert.notEqual(hash(sectionSource(section)),hash(sectionSource({...section,title:'Changed'})));
  assert.equal(hash({a:1,b:2}),hash({b:2,a:1}));
});
test('translation preserves links, images, prices and content structure', async () => {
  const original = db.pool.query;
  db.pool.query = async () => [[]];
  try {
    const source = {title:'An entirely new community announcement',content:{url:'/sports-betting',image:'/images/demo.svg',price:'RM 250',count:14,items:['A newly written description']}};
    const translated = await require('../services/automatic-translations').translateDocument(source,'zh', async texts => texts.map(text=>'翻译 '+text));
    assert.match(translated.title,/翻译/);
    assert.equal(translated.content.url,source.content.url);
    assert.equal(translated.content.image,source.content.image);
    assert.equal(translated.content.price,'RM 250');
    assert.equal(translated.content.count,14);
    assert.match(translated.content.items[0],/翻译/);
    assert.equal(source.title,'An entirely new community announcement');
  } finally { db.pool.query = original; await db.pool.end(); }
});
