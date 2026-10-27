require('dotenv').config({quiet:true});
const {test}=require('node:test');
const assert=require('node:assert/strict');
test('custom page draft, sections, publication, locales and isolation work end to end',{skip:process.env.ARENA_PAGE_TEST!=='1'},async()=>{
  const db=require('../db'),root=process.env.BUILDER_TEST_URL||'http://localhost:3001';
  const slug='cms-check-'+Date.now();
  try {
    const login=await fetch(root+'/admin/login',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:process.env.ADMIN_USERNAME,password:process.env.ADMIN_PASSWORD})});
    assert.equal(login.status,302);await login.text();
    const headers={cookie:login.headers.get('set-cookie').split(';')[0],'X-Requested-With':'fetch','Content-Type':'application/json'};
    const api=async(method,path,body,status=200)=>{
      const response=await fetch(root+'/api/admin'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
      const data=await response.json();assert.equal(response.status,status,data.error);return data;
    };
    const {page}=await api('POST','/pages',{name:'Custom page check',slug},201);
    assert.equal(page.is_visible,false);
    assert.equal((await fetch(root+'/en/'+slug)).status,404);
    assert.equal((await fetch(root+'/en/'+slug+'?preview=1',{headers})).status,200);
    const {section}=await api('POST','/pages/'+slug+'/sections',{template:'builder_section'},201);
    assert.equal(section.page_slug,slug);assert.deepEqual(section.content.blocks,[]);
    await api('PUT','/pages/'+slug+'/sections/'+section.section_key,{...section,is_visible:true,content:{blocks:[{id:'test-title',type:'heading',content:{text:'Welcome',level:'h1'}}]}});
    await api('DELETE','/pages/home/sections/'+section.section_key,undefined,400);
    await api('PUT','/pages/'+slug,{content:page.content,is_visible:true});
    for(const locale of ['en','ms','zh']){
      const response=await fetch(root+'/'+locale+'/'+slug);assert.equal(response.status,200);
      const html=await response.text();assert.match(html,/test-title/);assert.ok(html.includes('/'+locale+'/'+slug));
    }
    assert.equal((await fetch(root+'/'+slug)).status,200);
    const sitemap=await(await fetch(root+'/sitemap.xml')).text();assert.ok(sitemap.includes('/en/'+slug));
    await api('DELETE','/pages/'+slug+'/sections/'+section.section_key);
    assert.ok((await api('GET','/pages/'+slug+'/section-builder')).archived.some(s=>s.section_key===section.section_key));
    await api('POST','/pages/'+slug+'/sections/'+section.section_key+'/unarchive');
    assert.equal((await db.getSection(section.section_key,slug)).is_visible,false);
  } finally {
    await db.pool.query('DELETE FROM sections WHERE page_slug=?',[slug]);
    await db.pool.query('DELETE FROM page_translations WHERE slug=?',[slug]);
    await db.pool.query('DELETE FROM landing_pages WHERE slug=?',[slug]);
    await db.pool.end();
  }
});
