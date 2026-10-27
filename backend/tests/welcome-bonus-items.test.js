const {test}=require('node:test');
const assert=require('node:assert/strict'),ejs=require('ejs'),path=require('path');
const convert=require('../services/welcome-bonus-items');
const {valid}=require('../services/content-blocks');
test('all Welcome Bonus sections preserve their content as valid editable items',async()=>{
  for(const section of require('../db/welcome-bonus').sections){
    const before=JSON.stringify(section),result=convert(section);
    assert.equal(valid(result.content),true,section.section_key);assert.equal(result.title,'');assert.equal(JSON.stringify(section),before);
    const html=await ejs.renderFile(path.join(__dirname,'../../views/sections/builder_section.ejs'),{s:{...section,...result},c:result.content,sectionLayout:require('../services/section-layout'),safeUrl:require('../utils/view-helpers').safeUrl,t:text=>text,highlight:require('../utils/view-helpers').highlight});
    assert.ok(html.includes(require('../utils/view-helpers').escapeHtml(section.title)),section.section_key);
    if(section.section_key==='bonus_hero'){assert.match(html,/<h1>/);assert.ok(html.includes('RM 588'));assert.equal(result.content.blocks.find(b=>b.type==='bonus_reward_card').content.target_date,section.content.target_date);}
    if(section.section_key==='bonus_offers'){assert.equal(result.content.anchor,'bonus-offers');assert.deepEqual(result.content.blocks.at(-1).content.offers,section.content.offers);}
    if(section.section_key==='bonus_comparison'){const table=result.content.blocks.find(b=>b.type==='table').content;assert.equal(table.columns.length,7);assert.deepEqual(table.rows[0],[section.content.rows[0].offer,section.content.rows[0].eligibility,section.content.rows[0].percentage,section.content.rows[0].benefit,section.content.rows[0].minimum_deposit,section.content.rows[0].requirements,section.content.rows[0].validity]);}
    if(section.section_key==='bonus_terms')assert.equal(result.content.anchor,'bonus-terms');
    if(section.section_key==='bonus_cta')assert.equal(result.content.blocks.at(-1).content.secondary_button.url,section.content.secondary_button.url);
  }
});
