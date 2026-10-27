const {test}=require('node:test');
const assert=require('node:assert/strict');
const {valid}=require('../services/content-blocks');
test('blank and mixed sections validate against supported content definitions',()=>{
  assert.equal(valid({blocks:[]}),true);
  const text={id:'text-1',type:'text',content:{paragraphs:['Hello']}};
  const table={id:'table-1',type:'table',content:{columns:['A','B','C'],rows:[['1','2','3']]}};
  assert.equal(valid({blocks:[text,table]}),true);
  assert.equal(valid({blocks:[text,text]}),false);
  assert.equal(valid({blocks:[{...text,type:'../index'}]}),false);
  assert.equal(valid({blocks:[{...text,content:{paragraphs:[{}]}}]}),false);
  assert.equal(valid({blocks:[{...table,content:{columns:['A'],rows:[['1','2']]}}]}),false);
});
