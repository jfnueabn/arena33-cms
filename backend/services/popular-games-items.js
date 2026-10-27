module.exports=function convert(section) {
  const c=typeof section.content==='string'?JSON.parse(section.content):section.content;
  const kind=section.template||section.section_key;
  const blocks=[],hero=kind==='games_hero';
  const add=(id,type,content,style={align:hero?'left':'center'})=>blocks.push({id,type,content,style});
  const t=text=>require('../utils/ui-translations')(text,section.locale||'en');
  if(kind==='games_providers') {
    add('providers','providers',{title:section.title||'',eyebrow:section.eyebrow||'',subtitle:section.subtitle||'',providers:c.providers});
  } else {
    if(section.eyebrow)add('section-label','badge',{text:section.eyebrow});
    if(section.title)add('section-heading','heading',{text:section.title,level:hero?'h1':'h2'});
    if(section.subtitle)add('section-subtitle','text',{paragraphs:[section.subtitle]});
    if(hero) {
      for(const block of blocks)block.style.column='1';
      add('hero-buttons','buttons',{items:[{...c.primary_button,variant:'primary'},{...c.secondary_button,variant:'outline'}]},{column:'1'});
      add('hero-visual','game_visual',{image:c.image||'',image_alt:c.image_alt||'',label:t('THE COLLECTION'),icons:['🎮','🃏','⚽','🎡'],caption:t('Discover. Explore. Find your favourite.')},{column:'2'});
    } else if(kind==='games_collection')add('game-list','game_collection',{games:c.games});
    else if(kind==='games_about')add('about-text','text',{paragraphs:c.paragraphs},{align:'left',width:'full'});
    else if(kind==='games_guides')add('guides','cards',{items:c.guides},{align:'left'});
    else if(kind==='games_faq') {
      add('faq','faq',{items:c.items},{align:'left'});
      add('notice','notice',{text:c.notice||''},{align:'left'});
    } else if(kind==='games_cta')add('cta-button','button',c.button);
    else throw new Error('Unsupported Popular Games section');
  }
  return {title:'',eyebrow:'',subtitle:'',is_visible:section.is_visible,content:{...(kind==='games_collection'?{anchor:'game-collection'}:{}),layout:{columns:hero?2:1,variant:hero?'hero':'plain',width:['games_about','games_faq'].includes(kind)?'narrow':'standard',align:hero?'left':'center',gap:'normal',vertical_align:'center'},blocks}};
};
