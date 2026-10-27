const {test}=require('node:test');
const assert=require('node:assert/strict');
const layout=require('../services/section-layout');

test('reducing columns preserves placement for restoring the wider layout',()=>{
  const blocks=[{id:'text',style:{column:'1'}},{id:'visual',style:{column:'2'}},{id:'extra',style:{column:'3'}}];
  assert.deepEqual(layout.groups(blocks,1)[0].columns.map(column=>column.map(block=>block.id)),[['text','visual','extra']]);
  assert.deepEqual(layout.groups(blocks,2)[0].columns.map(column=>column.map(block=>block.id)),[['text'],['visual','extra']]);
  assert.deepEqual(layout.groups(blocks,3)[0].columns.map(column=>column.map(block=>block.id)),[['text'],['visual'],['extra']]);
  assert.deepEqual(blocks.map(block=>block.style.column),['1','2','3']);
});
test('layout options accept presets and reject arbitrary CSS or unsafe URLs',()=>{
  assert.equal(layout.validLayout(undefined),true);
  assert.equal(layout.validLayout({columns:3,background_color:'#aabbcc',background_image:'/images/demo.png'}),true);
  assert.equal(layout.validLayout({columns:4}),false);
  assert.equal(layout.validLayout({background_color:'red;display:none'}),false);
  assert.equal(layout.validLayout({background_image:'javascript:alert(1)'}),false);
  assert.equal(layout.validBlock({column:'2',align:'right',padding:'large',color:'#ffffff'}),true);
  assert.equal(layout.validBlock({column:'4'}),false);
  assert.equal(layout.validBlock({padding:'10000px'}),false);
});
test('column placement stacks blocks together and supports full-width separators',()=>{
  const blocks=[{id:'image',style:{column:'1'}},{id:'heading',style:{column:'2'}},{id:'text',style:{column:'2'}},{id:'button',style:{column:'2'}},{id:'table',style:{column:'full'}},{id:'last'}];
  const groups=layout.groups(blocks,2);
  assert.deepEqual(groups[0].columns.map(column=>column.map(block=>block.id)),[['image'],['heading','text','button']]);
  assert.equal(groups[1].full,true);
  assert.equal(groups[1].columns[0][0].id,'table');
  assert.equal(groups[2].columns[0][0].id,'last');
});
