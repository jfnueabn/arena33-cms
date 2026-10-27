require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Opt in against the running local development server. Only temporary rows are removed.
test('homepage builder creates, previews, edits, duplicates, reorders, removes and restores sections', {skip:process.env.ARENA_BUILDER_TEST !== '1'}, async () => {
  const db = require('../db');
  const root = process.env.BUILDER_TEST_URL || 'http://localhost:3001';
  const keys = [];
  let originalOrder;
  try {
    const login = await fetch(root+'/admin/login',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:process.env.ADMIN_USERNAME,password:process.env.ADMIN_PASSWORD})});
    assert.equal(login.status,302);
    await login.text(); // Wait for Express to finish persisting the regenerated login session.
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const headers={cookie,'X-Requested-With':'fetch','Content-Type':'application/json'};
    async function api(method,path,body,status=200) {
      const response=await fetch(root+'/api/admin'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
      const data=await response.json();
      assert.equal(response.status,status,data.error);
      return data;
    }
    assert.equal((await fetch(root+'/api/admin/pages/home/section-builder')).status,401);
    await api('POST','/pages/page-that-does-not-exist/sections',{template:'builder_text'},404);
    await api('POST','/pages/home/sections',{template:'../../index'},400);
    await api('DELETE','/pages/home/sections/header',undefined,400);
    const {templates}=await api('GET','/pages/home/section-builder');
    assert.equal(templates.length,7);
    for(const template of templates) {
      const result=await api('POST','/pages/home/sections',{template:template.template},201);
      const section=result.section;keys.push(section.section_key);
      assert.equal(section.template,'builder_section');
      assert.equal(section.is_visible,false);
      assert.equal(result.translation.status,'complete');
      const publicHtml=await(await fetch(root+'/en/')).text();
      assert.ok(!publicHtml.includes('id="'+section.section_key+'"'));
      const previewPath='/en/?preview=1&section='+section.section_key;
      const anonymous=await(await fetch(root+previewPath)).text();
      assert.ok(!anonymous.includes('id="'+section.section_key+'"'));
      const preview=await fetch(root+previewPath,{headers});
      const html=await preview.text();
      assert.equal(preview.status,200);
      assert.ok(!html.includes('id="'+section.section_key+'"'));
      assert.ok(html.includes('noindex'));
      assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
      if(template.template==='builder_section') {
        assert.deepEqual(section.content,{blocks:[]});assert.equal(section.title,'');
        await api('PUT','/pages/home/sections/'+section.section_key,{...section,is_visible:true,content:{blocks:[{id:'extra-h1',type:'heading',content:{text:'Extra page heading',level:'h1'}}]}},400);
        const content={layout:{columns:2,background_color:'#142750',padding:'large',align:'left'},blocks:[{style:{column:'2',align:'right',color:'#ffffff'},id:'text-block',type:'text',content:{paragraphs:['A new introduction for our visitors.']}},{id:'table-block',type:'table',content:{columns:['Feature','Details','More'],rows:[['One','Two','Three']]}},{id:'button-block',type:'button',content:{text:'Contact us',url:'#footer'}}]};
        const mixed=await api('PUT','/pages/home/sections/'+section.section_key,{...section,content,is_visible:true});
        assert.equal(mixed.translation.status,'complete');
        for(const locale of ['en','ms','zh']) {
          const localized=await db.getSection(section.section_key,'home',locale);
          assert.deepEqual(localized.content.blocks.map(block=>block.type),['text','table','button']);
          assert.equal(localized.content.layout.columns,2);
          assert.equal(localized.content.layout.background_color,'#142750');
          assert.equal(localized.content.blocks[0].style.column,'2');
          assert.equal(localized.content.blocks[0].style.align,'right');
          assert.deepEqual(localized.content.blocks.map(block=>block.id),['text-block','table-block','button-block']);
          const html=await(await fetch(root+'/'+locale+'/')).text();
          assert.ok(html.includes('id="'+section.section_key+'-table-block"'));
        }
        await api('PUT','/pages/home/sections/'+section.section_key,{...section,content:{blocks:[{id:'bad',type:'../index',content:{}}]}},400);
        const styledTags=[
          {text:'Top tag',style:{position:'top',align:'right',size:'small',color:'#ffffff',background:'#123456'}},
          {text:'Middle tag',style:{position:'middle',align:'center',size:'large',color:'#ffcc00',background:''}},
          {text:'Bottom tag',style:{position:'bottom',align:'left',size:'normal',color:'',background:'#234567'}}
        ];
        const visual={blocks:[{id:'styled-visual',type:'hero_visual',content:{image:'',image_alt:'Test illustration',emoji:'⚽',tags:styledTags}}]};
        await api('PUT','/pages/home/sections/'+section.section_key,{...section,content:visual,is_visible:true});
        for(const locale of ['en','ms','zh']) {
          const localized=await db.getSection(section.section_key,'home',locale);
          assert.deepEqual(localized.content.blocks[0].content.tags.map(tag=>tag.style),styledTags.map(tag=>tag.style));
          const html=await(await fetch(root+'/'+locale+'/')).text();
          const area=html.split('id="'+section.section_key+'-styled-visual"')[1].split('</section>')[0];
          assert.ok(area.includes('hero-tag-size-large'));
          assert.ok(area.includes('background-color:#123456'));
        }
        await api('PUT','/pages/home/sections/'+section.section_key,section);
      }
      const updated=await api('PUT','/pages/home/sections/'+section.section_key,{...section,name:'Builder integration fixture',is_visible:true});
      if(template.template==='builder_table') {
        const content={blocks:[{id:'custom-table',type:'table',content:{columns:['Feature','Basic','Pro','Elite'],rows:[['Storage','10','20','30'],['Support','1','2','3']]}}]};
        const expanded=await api('PUT','/pages/home/sections/'+section.section_key,{...updated.section,content});
        assert.deepEqual(expanded.section.content,content);
        for(const locale of ['en','ms','zh']) {
          const html=await(await fetch(root+'/'+locale+'/')).text();
          const table=html.split('id="'+section.section_key+'"')[1].split('</section>')[0];
          assert.equal((table.match(/scope="col"/g)||[]).length,4);
          assert.ok(table.includes('30'));
        }
        await api('PUT','/pages/home/sections/'+section.section_key,{...updated.section,content:{columns:['Broken'],rows:[['One','Two']]}},400);
        // Restore the original fixture so the existing archive checks compare the same content.
        await api('PUT','/pages/home/sections/'+section.section_key,updated.section);
      }
      for(const locale of ['en','ms','zh']) {
        const localized=await(await fetch(root+'/'+locale+'/')).text();
        assert.ok(localized.includes('id="'+section.section_key+'"'));
      }
      if(template.template==='builder_cards') {
        const duplicate=await api('POST','/pages/home/sections',{source_key:section.section_key},201);
        keys.push(duplicate.section.section_key);
        assert.deepEqual(duplicate.section.content,section.content);
        assert.equal(duplicate.section.is_visible,false);
        assert.notEqual(duplicate.section.section_key,section.section_key);
      }
      await api('PUT','/pages/home/sections/'+section.section_key,{...updated.section,content:{}},400);
      await api('DELETE','/pages/home/sections/'+section.section_key);
      assert.ok(!(await db.getSection(section.section_key,'home','en')));
      assert.ok((await api('GET','/pages/home/section-builder')).archived.some(row=>row.section_key===section.section_key));
      const restored=await api('POST','/pages/home/sections/'+section.section_key+'/unarchive');
      assert.equal(restored.section.is_visible,false);
      assert.deepEqual(restored.section.content,section.content);
      await api('PUT','/pages/home/sections/'+section.section_key+'?locale=zh',section,403);
    }
    originalOrder=(await db.getSections('home')).filter(section=>!section.is_fixed).map(section=>({key:section.section_key,order:section.sort_order}));
    const order=originalOrder.map(section=>section.key).reverse();
    const reordered=await api('PUT','/pages/home/sections-order',{order});
    assert.deepEqual(reordered.sections.filter(section=>section.page_slug==='home').map(section=>section.section_key),order);
  } finally {
    if(originalOrder)for(const section of originalOrder)await db.pool.query('UPDATE sections SET sort_order=? WHERE section_key=?',[section.order,section.key]);
    for(const key of keys)await db.pool.query('DELETE FROM sections WHERE section_key=?',[key]);
    await db.pool.end();
  }
});
