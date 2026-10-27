const {test}=require('node:test');
const assert=require('node:assert/strict');
const validSlug=require('../services/page-slug');
test('custom page URLs reject route conflicts, traversal and invalid names',()=>{
  for(const slug of ['test','new-page','company-2026'])assert.equal(validSlug(slug),true);
  for(const slug of ['home','shared','admin','api','en','uploads','../test','Test','test/child','-test','test--page','x'.repeat(65),''])assert.equal(validSlug(slug),false);
  assert.equal(require('../utils/locales').localizeUrl('/en/test#info','ms',['home','test']),'/ms/test#info');
  assert.equal(require('../utils/locales').localizeUrl('/uploads/test.png','ms',['home','test']),'/uploads/test.png');
});

test('page creation requires auth, creates a draft, optionally links the header and rejects duplicates',async t=>{
  const express=require('express'),db=require('../db');
  const translator=require('../services/automatic-translations'),originalSyncPage=translator.syncPage,originalSyncSection=translator.syncSection;
  translator.syncPage=translator.syncSection=async()=>({status:'complete'});
  const originals={getPage:db.getPage,getSections:db.getSections,connection:db.pool.getConnection};
  const pages=new Map();let nav=[{label:'Home',url:'/'}],committed=0,rolledBack=0;
  db.getPage=async slug=>pages.get(slug);
  db.getSections=async()=>[];
  db.pool.getConnection=async()=>({
    beginTransaction:async()=>{},commit:async()=>{committed++;},rollback:async()=>{rolledBack++;},release:()=>{},
    query:async(sql,values)=>{
      if(sql.startsWith('INSERT INTO landing_pages')){
        if(pages.has(values[0]))throw Object.assign(new Error('duplicate'),{code:'ER_DUP_ENTRY'});
        pages.set(values[0],{slug:values[0],name:values[1],title:values[1],content:JSON.parse(values[2]),is_visible:false});return [{affectedRows:1}];
      }
      if(sql.startsWith('SELECT content'))return [[{content:{nav}}]];
      if(sql.startsWith('UPDATE sections')){nav=JSON.parse(values[0]).nav;return [{affectedRows:1}];}
      throw new Error('Unexpected SQL');
    }
  });
  const app=express();app.use(express.json());app.use((req,res,next)=>{req.session=req.get('test-auth')?{admin:{id:1}}:{};next();});app.use('/api/admin',require('../routes/admin-api'));
  app.use((error,req,res,next)=>res.status(500).json({error:error.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));Object.assign(db,{getPage:originals.getPage,getSections:originals.getSections});db.pool.getConnection=originals.connection;translator.syncPage=originalSyncPage;translator.syncSection=originalSyncSection;await db.pool.end();});
  const send=(body,auth=true)=>fetch('http://127.0.0.1:'+server.address().port+'/api/admin/pages',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'fetch',...(auth?{'test-auth':'yes'}:{})},body:JSON.stringify(body)});
  assert.equal((await send({name:'Test',slug:'test'},false)).status,401);
  for(const body of [{name:'Test',slug:'admin'},{name:'',slug:'test'},{name:'Test',slug:'test',add_to_header:'yes'}])assert.equal((await send(body)).status,400);
  const response=await send({name:'Test',slug:'test',add_to_header:true});assert.equal(response.status,201);
  const result=await response.json();assert.equal(result.page.is_visible,false);assert.equal(result.page.content.seo_title,'Test');assert.deepEqual(nav.at(-1),{label:'Test',url:'/test'});
  assert.equal((await send({name:'Again',slug:'test'})).status,409);
  const count=nav.length;assert.equal((await send({name:'Private',slug:'private-page'})).status,201);assert.equal(nav.length,count);
  assert.equal(committed,2);assert.equal(rolledBack,1);
});
