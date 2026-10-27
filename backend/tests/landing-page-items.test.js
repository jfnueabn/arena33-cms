const {test}=require('node:test');
const assert=require('node:assert/strict'),ejs=require('ejs'),path=require('path');
const convert=require('../services/landing-page-items');
const {valid}=require('../services/content-blocks');
test('all remaining header pages convert to valid items preserving content, visibility and anchors',async()=>{
  let count=0;
  for(const name of ['sports-betting','virtual-sports','sports','match-odds','baccarat']) {
    const page=require('../db/'+name);
    for(const section of page.sections){
      const before=JSON.stringify(section),result=convert(section);
      assert.equal(valid(result.content),true,section.section_key);assert.equal(result.title,'');assert.equal(result.is_visible,section.is_visible);assert.equal(JSON.stringify(section),before);
      if(section.content.anchor)assert.equal(result.content.anchor,section.content.anchor);
      const html=await ejs.renderFile(path.join(__dirname,'../../views/sections/builder_section.ejs'),{s:{...section,...result},c:result.content,sectionLayout:require('../services/section-layout'),safeUrl:require('../utils/view-helpers').safeUrl,t:text=>text,highlight:require('../utils/view-helpers').highlight});
      assert.ok(html.includes(require('../utils/view-helpers').escapeHtml(section.title)),section.section_key);
      if(section.template.endsWith('_hero'))assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
      if(section.template==='sports_hero'){
        assert.deepEqual(result.content.blocks.find(b=>b.type==='match_preview').content.matches,section.content.matches);
        assert.deepEqual(result.content.blocks.find(b=>b.type==='highlights').content.items,section.content.highlights);
      }
      if(section.template==='sports_categories')assert.deepEqual(result.content.blocks.at(-1).content.items,section.content.items);
      if(section.template==='odds_examples')assert.deepEqual(result.content.blocks.find(b=>b.type==='table').content.rows,section.content.rows.map(row=>[row.odds,row.stake,row.returns,row.profit]));
      count++;
    }
  }
  assert.equal(count,37);
});
test('sport category visibility remains editable and match text is escaped',async()=>{
  const section=structuredClone(require('../db/sports-betting').sections[0]);section.content.matches[0].home='<script>bad</script>';
  const result=convert(section),block=result.content.blocks.find(b=>b.type==='match_preview');
  const html=await ejs.renderFile(path.join(__dirname,'../../views/partials/sports-content-block.ejs'),{block,value:block.content});
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
  const categories=convert(require('../db/sports-betting').sections[1]);categories.content.blocks.at(-1).content.items[0].visible='yes';assert.equal(valid(categories.content),false);
});
