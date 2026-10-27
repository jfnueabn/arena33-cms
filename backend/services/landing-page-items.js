module.exports=function convert(section) {
  const c=typeof section.content==='string'?JSON.parse(section.content):section.content;
  const template=section.template;
  let result;
  if(['games_hero','games_guides','games_about'].includes(template))result=require('./popular-games-items')({...section,content:c});
  else if(['bonus_about','steps','bonus_terms','faq','bonus_cta'].includes(template)) {
    const key={bonus_about:'bonus_about',steps:'bonus_steps',bonus_terms:'bonus_terms',faq:'bonus_faq',bonus_cta:'bonus_cta'}[template];
    result=require('./welcome-bonus-items')({...section,content:c,section_key:key});
    if(!c.anchor)delete result.content.anchor;
    if(template==='faq')result.content.anchor='faq';
  } else {
    const blocks=[],hero=template==='sports_hero';
    const add=(id,type,content,style={align:'center'})=>blocks.push({id,type,content,style});
    const t=text=>require('../utils/ui-translations')(text,section.locale||'en');
    if(hero)add('breadcrumb','breadcrumb',{items:[{label:t('Home'),url:'/'},{label:c.breadcrumb||t('Sports Betting'),url:''}]},{column:'full',align:'left'});
    if(section.eyebrow)add('label','badge',{text:section.eyebrow});
    if(section.title)add('heading','heading',{text:section.title,level:hero?'h1':'h2'});
    if(section.subtitle)add('subtitle','text',{paragraphs:[section.subtitle]});
    if(hero) {
      for(const block of blocks)if(block.type!=='breadcrumb')block.style={column:'1',align:'left'};
      add('description','text',{paragraphs:[c.description]},{column:'1'});
      add('buttons','buttons',{items:[{...c.primary_button,variant:'primary'},{...c.secondary_button,variant:'outline'}]},{column:'1'});
      add('matches','match_preview',{preview_label:c.preview_label,preview_note:c.preview_note,matches:c.matches},{column:'2'});
      add('highlights','highlights',{items:c.highlights},{column:'full'});
    } else if(template==='sports_categories')add('categories','sport_categories',{items:c.items},{align:'left'});
    else if(template==='sports_markets')add('markets','feature_cards',{items:c.items},{align:'left'});
    else if(template==='odds_examples') {
      add('intro','text',{paragraphs:[c.intro]},{align:'left'});
      add('table','table',{columns:['odds','stake','returns','profit'].map(key=>c.columns[key]),rows:c.rows.map(row=>[row.odds,row.stake,row.returns,row.profit])},{align:'left'});
      add('formula','heading',{text:c.formula,level:'h3'},{align:'left'});
      add('note','notice',{text:c.note},{align:'left'});
    } else throw new Error('Unsupported landing page template: '+template);
    const anchor=c.anchor||({sports_categories:'sports-categories',sports_markets:'sports-markets'}[template])||'';
    result={title:'',eyebrow:'',subtitle:'',is_visible:section.is_visible,content:{...(anchor?{anchor}:{}),layout:{columns:hero?2:1,variant:hero?'hero':'plain',gap:'normal',vertical_align:'center'},blocks}};
  }
  return result;
};
