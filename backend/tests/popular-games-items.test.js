const {test}=require('node:test');
const assert=require('node:assert/strict');
const convert=require('../services/popular-games-items');
const {valid}=require('../services/content-blocks');
const ejs=require('ejs'),path=require('path');
const sections=require('../db/page-sections')(require('../db/popular-games'));
test('Popular Games converts every saved section to reusable items without mutating content',async()=>{
  for(const section of sections){
    const original=JSON.stringify(section),result=convert(section);
    assert.equal(valid(result.content),true,section.section_key);
    assert.equal(result.title,'');assert.equal(result.is_visible,section.is_visible);assert.equal(JSON.stringify(section),original);
    const html=await ejs.renderFile(path.join(__dirname,'../../views/sections/builder_section.ejs'),{s:{...section,...result},c:result.content,sectionLayout:require('../services/section-layout'),safeUrl:require('../utils/view-helpers').safeUrl,t:text=>text,highlight:require('../utils/view-helpers').highlight});
    if(section.template!=='games_providers')assert.ok(html.includes(require('../utils/view-helpers').escapeHtml(section.title)),section.template);
    if(section.template==='games_hero'){assert.match(html,/<h1>/);assert.equal(result.content.layout.columns,2);assert.equal(result.content.blocks.at(-1).content.image,section.content.image);}
    if(section.template==='games_collection'){assert.equal(result.content.anchor,'game-collection');assert.deepEqual(result.content.blocks.at(-1).content.games,section.content.games);assert.match(html,/data-game-collection/);assert.doesNotMatch(html,/id="gamesCount"/);}
    if(section.template==='games_faq')assert.equal(result.content.blocks.at(-1).content.text,section.content.notice);
    if(section.template==='games_providers')assert.equal(html.trim(),'');
  }
});
test('collection items preserve hidden games and reject malformed content',async()=>{
  const game=structuredClone(sections.find(s=>s.template==='games_collection').content.games[0]);
  const content={blocks:[{id:'collection',type:'game_collection',content:{games:[{...game,visible:false},{...game,name:'<script>bad</script>',url:'javascript:alert(1)'}]}}]};
  assert.equal(valid(content),true);
  const html=await ejs.renderFile(path.join(__dirname,'../../views/partials/game-content-block.ejs'),{block:content.blocks[0],value:content.blocks[0].content,t:text=>text,safeUrl:require('../utils/view-helpers').safeUrl});
  assert.equal((html.match(/data-game-category=/g)||[]).length,1);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/javascript:/);
  content.blocks[0].content.games[0].visible='yes';assert.equal(valid(content),false);
});
