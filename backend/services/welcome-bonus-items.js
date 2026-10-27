module.exports=function convert(section) {
  const c=typeof section.content==='string'?JSON.parse(section.content):section.content;
  const key=section.section_key,hero=key==='bonus_hero',blocks=[];
  const t=text=>require('../utils/ui-translations')(text,section.locale||'en');
  const add=(id,type,content,style={align:'center'})=>blocks.push({id,type,content,style});
  if(hero)add('breadcrumb','breadcrumb',{items:[{label:t('Home'),url:'/'},{label:t('Welcome Bonus'),url:''}]},{column:'full',align:'left'});
  if(key!=='bonus_cta') {
    if(section.eyebrow)add('label','badge',{text:section.eyebrow});
    if(section.title)add('heading','heading',{text:section.title,level:hero?'h1':'h2'});
    if(section.subtitle)add('subtitle','text',{paragraphs:[section.subtitle]});
  }
  if(hero) {
    for(const block of blocks)if(block.type!=='breadcrumb')block.style={column:'1',align:'left'};
    add('description','text',{paragraphs:[c.description]},{column:'1'});
    add('buttons','buttons',{items:[{...c.primary_button,variant:'primary'},{...c.secondary_button,variant:'outline'}]},{column:'1'});
    add('reward','bonus_reward_card',{gift:'🎁',sample_label:c.sample_label||'',card_label:c.card_label,card_value:c.card_value,card_description:c.card_description,highlights:c.highlights,target_date:c.target_date||'',countdown_label:c.countdown_label||t('Offer period'),countdown_empty:c.countdown_empty||t('Contact us for the current offer period.')},{column:'2'});
    if(c.image)add('image','image',{image:c.image,image_alt:c.image_alt||''},{column:'full'});
  } else if(key==='bonus_offers') {
    if(c.notice)add('notice','notice',{text:c.notice},{align:'left'});
    add('offers','bonus_offers',{offers:c.offers},{align:'left'});
  } else if(key==='bonus_about') {
    for(const block of blocks)block.style={column:'1',align:'left'};
    add('paragraphs','text',{paragraphs:c.paragraphs},{column:'1'});
    if(c.detail_title)add('detail-heading','heading',{text:c.detail_title,level:'h3'},{column:'1'});
    if(c.detail_description)add('detail-text','text',{paragraphs:[c.detail_description]},{column:'1'});
    if(c.image)add('image','image',{image:c.image,image_alt:c.image_alt||''},{column:'2'});
  } else if(key==='bonus_steps')add('steps','steps',{items:c.items},{align:'left'});
  else if(key==='bonus_comparison') {
    add('table','table',{columns:['Bonus type','Eligibility','Percentage','Maximum credit','Minimum deposit','Play-through','Valid period'].map(t),rows:c.rows.map(row=>[row.offer,row.eligibility,row.percentage||t('See terms'),row.benefit,row.minimum_deposit||t('See terms'),row.requirements,row.validity])},{align:'left'});
    if(c.note)add('note','notice',{text:c.note},{align:'left'});
  } else if(key==='bonus_methods') {
    add('paragraphs','text',{paragraphs:c.paragraphs},{align:'left'});
    add('methods','providers',{title:'',eyebrow:'',subtitle:'',providers:c.methods},{align:'center'});
    if(c.note)add('note','notice',{text:c.note},{align:'left'});
  } else if(key==='bonus_terms') {
    add('terms','bullet_list',{items:c.items},{align:'left'});
    if(c.note)add('note','notice',{text:c.note},{align:'left'});
  } else if(key==='bonus_faq')add('faq','faq',{items:c.items},{align:'left'});
  else if(key==='bonus_cta')add('cta','bonus_cta',{label:section.eyebrow||t('Your next step'),title:section.title,description:c.description,button:c.button,secondary_button:c.secondary_button||{text:'',url:''},note:c.note||''});
  else throw new Error('Unsupported Welcome Bonus section');
  const anchor=c.anchor||({bonus_offers:'bonus-offers',bonus_steps:'how-to-claim',bonus_terms:'bonus-terms',bonus_cta:'bonus-contact'}[key])||'';
  return {title:'',eyebrow:'',subtitle:'',is_visible:section.is_visible,content:{...(anchor?{anchor}:{}),layout:{columns:hero||key==='bonus_about'?2:1,variant:hero?'hero':'plain',width:['bonus_methods','bonus_terms','bonus_faq'].includes(key)?'narrow':'standard',gap:'normal',align:'center',vertical_align:'center'},blocks}};
};
