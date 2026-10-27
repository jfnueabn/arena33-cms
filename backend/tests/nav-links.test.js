const {test}=require('node:test'),assert=require('node:assert/strict');
const {duplicate}=require('../../public/admin/nav-links');
const {headerPages}=require('../../public/admin/nav-links');
test('editor pages follow header order and exclude old pages sharing the same name',()=>{
  const pages=[{slug:'b',name:'Test'},{slug:'test',name:'Test'},{slug:'home',name:'Homepage'}];
  assert.deepEqual(headerPages([{url:'/'},{url:'/test'}],pages).map(page=>page.slug),['home','test']);
  assert.deepEqual(headerPages([{url:'/test'},{url:'/'}],pages).map(page=>page.slug),['test','home']);
  assert.deepEqual(headerPages([{url:'/b'}],pages).map(page=>page.slug),['b']);
  assert.deepEqual(headerPages([{url:'/'},{url:'/test'},{url:'/en/test/'}],pages).map(page=>page.slug),['home','test']);
  assert.deepEqual(headerPages([{url:'https://example.com/test'},{url:'/missing'}],pages),[]);
});
const links=(a,b)=>[{label:'Baccarat',url:a},{label:'Test',url:b}];
test('header duplicate validation detects equivalent destinations and generated URLs',()=>{
  for(const url of ['/baccarat','/baccarat/','/en/baccarat','/ms/baccarat/','/zh/baccarat?source=nav','http://localhost:3001/baccarat']) {
    const conflict=duplicate(links('/baccarat',url),'http://localhost:3001');
    assert.deepEqual(conflict.indexes,[0,1]);assert.match(conflict.message,/Baccarat.*Test/);
  }
  assert.ok(duplicate([{label:'Test',url:'/test'},{label:'Test',url:''}]));
  assert.ok(duplicate(links('https://example.com/path','https://example.com/path/')));
});
test('different pages, anchors and external sites can coexist',()=>{
  for(const [a,b] of [['/baccarat','/test'],['/#about','/#features'],['/test#one','/test#two'],['/test','https://example.com/test']])assert.equal(duplicate(links(a,b)),null);
});
