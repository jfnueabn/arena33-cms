const {test}=require('node:test'),assert=require('node:assert/strict');
const breadcrumbs=require('../services/breadcrumbs');
test('automatic page paths use navigation labels and omit the homepage',()=>{
  const header={content:{nav:[{label:'Popular Games',url:'/en/popular-games/'}]}};
  const result=breadcrumbs({slug:'popular-games',name:'Games'},header,[]);
  assert.equal(result.automatic,true);assert.deepEqual(result.items,[{label:'Home',url:'/'},{label:'Popular Games',url:''}]);
  assert.deepEqual(breadcrumbs({slug:'home'},header,[]).items,[]);
});
test('editable nested breadcrumb items override the automatic path without duplicates',()=>{
  const items=[{label:'Home',url:'/'},{label:'Sports',url:'/sports'},{label:'IBCBET',url:''}];
  const result=breadcrumbs({slug:'ibcbet'},null,[{content:{blocks:[{type:'breadcrumb',content:{items}}]}}]);
  assert.equal(result.automatic,false);assert.deepEqual(result.items,items);
  assert.equal(result.renderAtTop,true);
});
test('new blank pages and legacy heroes always receive the standard top path',()=>{
  for(const sections of [[],[{template:'bonus_hero',content:{}}],[{template:'sports_hero',content:{}}],[{content:{blocks:[{type:'breadcrumb',content:{items:[]}}]}}]]) {
    const result=breadcrumbs({slug:'new-page',name:'New Page'},null,sections);
    assert.equal(result.renderAtTop,true);assert.deepEqual(result.items,[{label:'Home',url:'/'},{label:'New Page',url:''}]);
  }
});
