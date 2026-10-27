const {test}=require('node:test');
const assert=require('node:assert/strict');
const {slugFor,sync}=require('../services/header-pages');
test('header pages only use valid internal page destinations',()=>{
  assert.equal(slugFor('/en/test/?view=1#info'),'test');
  for(const url of ['https://example.com/test','//example.com/test','#footer','/admin','/images/a.png','/api','/../test','/'])assert.equal(slugFor(url),null);
});
test('header save creates published pages and one blank section without overwriting existing content',async()=>{
  const pages=new Map([['draft',{visible:false}]]),sections=new Map(),calls=[];
  const conn={query:async(sql,args)=>{
    calls.push(sql);
    if(sql.startsWith('SELECT slug'))return [[...(pages.has(args[0])?[{slug:args[0]}]:[])]];
    if(sql.startsWith('INSERT INTO landing_pages')){pages.set(args[0],{visible:true});return [{}];}
    if(sql.startsWith('UPDATE landing_pages')){pages.get(args[0]).visible=true;return [{}];}
    if(sql.startsWith('SELECT section_key'))return [[...(sections.has(args[0])?[{section_key:sections.get(args[0]).key}]:[])]];
    if(sql.startsWith('INSERT INTO sections')){sections.set(args[1],{key:args[0],content:JSON.parse(args[2])});return [{}];}
    throw new Error('Unexpected SQL');
  }};
  const nav=[{label:'Test Page',url:''},{label:'Draft',url:'/draft'},{label:'Contact',url:'#footer'},{label:'External',url:'https://example.com'}];
  assert.deepEqual(await sync(conn,nav,[],1),['test-page','draft']);
  assert.equal(nav[0].url,'/test-page');assert.equal(pages.get('test-page').visible,true);assert.equal(pages.get('draft').visible,true);
  assert.deepEqual(sections.get('test-page').content,{blocks:[]});
  const before=calls.filter(sql=>sql.startsWith('INSERT')).length;
  pages.get('draft').visible=false;
  await sync(conn,nav,nav,1);
  assert.equal(calls.filter(sql=>sql.startsWith('INSERT')).length,before);assert.equal(pages.get('draft').visible,false);
});
