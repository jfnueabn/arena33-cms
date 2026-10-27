const {test}=require('node:test');
const assert=require('node:assert/strict');
const tags=require('../utils/hero-tags');
test('legacy tags retain the existing top-left and bottom-right defaults',()=>{
  assert.equal(tags.normalize('First',0).style.position,'top');
  assert.equal(tags.normalize('First',0).style.align,'left');
  assert.equal(tags.normalize('Third',2).style.position,'bottom');
  assert.equal(tags.normalize('Third',2).style.align,'right');
});
test('individual tag styles validate and reject unsafe CSS',()=>{
  const tag={text:'Custom',style:{position:'middle',align:'center',size:'large',color:'#ffffff',background:'#234567'}};
  assert.equal(tags.valid(tag),true);
  assert.deepEqual(tags.normalize(tag),tag);
  assert.equal(tags.valid({...tag,style:{...tag.style,color:'red;display:none'}}),false);
  assert.equal(tags.valid({...tag,style:{...tag.style,position:'absolute'}}),false);
  assert.equal(tags.valid({text:5}),false);
});
