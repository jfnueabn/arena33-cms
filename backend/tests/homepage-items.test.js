const {test}=require('node:test');
const assert=require('node:assert/strict');
const convert=require('../services/homepage-items');
const {valid}=require('../services/content-blocks');
const ejs=require('ejs');
const path=require('path');

test('existing custom homepage templates also convert to item sections',()=>{
  for(const template of require('../services/section-library').filter(item=>item.template!=='builder_section')){
    const source={...structuredClone(template),is_visible:false};
    const converted=convert(source,template.template);
    assert.equal(valid(converted.content),true,template.template);
    assert.equal(converted.is_visible,false);
    assert.equal(converted.title,'');
  }
});

test('every remaining homepage section converts to valid reusable items without losing content',async()=>{
  const defaults=require('../db/defaults').sections;
  const keys=['about','features','countdown','steps','comparison','plans','wheel','testimonials','faq','cta'];
  const blockView=path.join(__dirname,'../../views/partials/content-block.ejs');
  const locals={sectionLayout:require('../services/section-layout'),safeUrl:require('../utils/view-helpers').safeUrl,t:text=>text};
  for(const key of keys){
    const source=structuredClone(defaults.find(section=>section.section_key===key));
    source.is_visible=true;const before=JSON.stringify(source),converted=convert(source,key);
    assert.equal(valid(converted.content),true,key);
    assert.equal(JSON.stringify(source),before,key+' must not mutate source');
    const html=(await Promise.all(converted.content.blocks.map(block=>ejs.renderFile(blockView,{...locals,block,s:{section_key:key}})))).join('');
    const escaped=require('../utils/view-helpers').escapeHtml(source.title);
    assert.ok(html.includes(escaped),key+' preserves its heading');
    if(key==='about'){assert.deepEqual(converted.content.blocks.find(b=>b.type==='tag_list').content.tags,source.content.tags);assert.equal(converted.content.layout.columns,2);}
    if(key==='comparison')assert.deepEqual(converted.content.blocks.at(-1).content.rows,source.content.rows.map(row=>[row.feature,row.ours,row.others]));
    if(key==='steps')assert.equal(converted.content.anchor,'how');
    if(key==='cta')assert.equal(converted.content.anchor,'signup');
    if(key==='plans')assert.deepEqual(converted.content.blocks.at(-1).content.items,source.content.items);
    if(key==='wheel'){assert.deepEqual(converted.content.blocks.at(-1).content.prizes,source.content.prizes);assert.match(html,/data-spin-button/);assert.doesNotMatch(html,/id="wheel"/);}
    if(key==='countdown')assert.ok(html.includes(source.content.target_date));
  }
});

test('stats conversion preserves all counters and headings as editable content',()=>{
  const source={eyebrow:'Numbers',title:'Our community',subtitle:'Today',is_visible:false,content:{items:[{value:1234,suffix:'+',label:'Members'},{value:99.5,suffix:'%',label:'Uptime'}]}};
  const original=JSON.stringify(source),converted=convert(source,'stats');
  assert.equal(valid(converted.content),true);
  assert.equal(converted.is_visible,false);
  assert.equal(converted.title,'');
  assert.deepEqual(converted.content.blocks.map(b=>b.type),['badge','heading','text','counters']);
  assert.deepEqual(converted.content.blocks.at(-1).content.items,source.content.items);
  assert.equal(JSON.stringify(source),original);
});

test('promo conversion preserves banner, gradient and destination without starter copy',()=>{
  const source={eyebrow:'Offer',title:'Latest news',subtitle:'Read more',is_visible:true,content:{banner_title:'Saved promotion',banner_text:'Saved details',color_from:'#123',color_to:'#abcdef',button:{text:'Learn more',url:'#contact'}}};
  const converted=convert(source,'promo');
  assert.equal(valid(converted.content),true);
  const banner=converted.content.blocks.at(-1).content;
  assert.equal(banner.color_from,'#112233');
  assert.equal(banner.color_to,'#abcdef');
  assert.equal(banner.banner_title,source.content.banner_title);
  assert.deepEqual(banner.button,source.content.button);
  assert.equal(valid({blocks:[{id:'unsafe',type:'promo_banner',content:{...banner,color_from:'red;display:none'}}]}),false);
  assert.equal(valid({blocks:[{id:'invalid',type:'counters',content:{items:[{value:Infinity,suffix:'',label:''}]}}]}),false);
});

test('counter and promo blocks render escaped copy, animated numbers and safe links',async()=>{
  const render=async(block)=>ejs.renderFile(path.join(__dirname,'../../views/partials/content-block.ejs'),{block,s:{section_key:'test'},sectionLayout:require('../services/section-layout'),safeUrl:require('../utils/view-helpers').safeUrl});
  const counters=await render({id:'stats',type:'counters',content:{items:[{value:1234,suffix:'+',label:'<script>bad</script>'}]}});
  assert.match(counters,/data-count="1234"/);
  assert.match(counters,/&lt;script&gt;/);
  const banner=await render({id:'promo',type:'promo_banner',content:{banner_title:'<b>Saved</b>',banner_text:'Details',color_from:'#123456',color_to:'#abcdef',button:{text:'Go',url:'javascript:alert(1)'}}});
  assert.match(banner,/&lt;b&gt;Saved&lt;\/b&gt;/);
  assert.doesNotMatch(banner,/javascript:/);
});
