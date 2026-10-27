const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalize,valid}=require('../utils/table-content');
test('legacy two-column tables retain headings and cells',()=>{
  const legacy={first_column:'Saved heading',second_column:'Saved details',rows:[{label:'Custom row',value:'Custom value'}]};
  assert.deepEqual(normalize(legacy),{columns:['Saved heading','Saved details'],rows:[['Custom row','Custom value']]});
  assert.equal(legacy.rows[0].value,'Custom value');
});
test('custom tables support variable column counts and reject uneven or unsafe cells',()=>{
  const table={columns:['Feature','Basic','Pro','Elite'],rows:[['Storage','10','20','30']]};
  assert.equal(valid(table),true);
  assert.equal(valid({columns:['Only column'],rows:[]}),true);
  assert.equal(valid({...table,rows:[['Missing cells']]}),false);
  assert.equal(valid({...table,rows:[['Storage','10','20',{}]]}),false);
  assert.equal(valid({columns:[],rows:[]}),false);
  assert.equal(valid({columns:Array(13).fill('Column'),rows:[]}),false);
  assert.equal(normalize(table),table);
});
