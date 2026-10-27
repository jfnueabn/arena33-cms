// Preserve saved content when converting the legacy homepage sections to blocks.
module.exports=function convert(section,kind) {
  const c=typeof section.content==='string'?JSON.parse(section.content):section.content;
  const blocks=[];
  if(section.eyebrow)blocks.push({id:kind+'-label',type:'badge',content:{text:section.eyebrow},style:{align:'center'}});
  if(section.title&&kind!=='cta')blocks.push({id:kind+'-heading',type:'heading',content:{text:section.title,level:'h2'},style:{align:'center'}});
  if(section.subtitle)blocks.push({id:kind+'-subtitle',type:'text',content:{paragraphs:[section.subtitle]},style:{align:'center'}});
  if(kind==='stats')blocks.push({id:'stats-counters',type:'counters',content:{items:c.items.map(item=>({value:Number(item.value)||0,suffix:item.suffix||'',label:item.label||''}))}});
  else if(kind==='promo') {
    const hex=value=>/^#[0-9a-f]{6}$/i.test(value)?value:/^#[0-9a-f]{3}$/i.test(value)?'#'+value.slice(1).split('').map(c=>c+c).join(''):'#7c3aed';
    blocks.push({id:'promo-banner',type:'promo_banner',content:{banner_title:c.banner_title||'',banner_text:c.banner_text||'',color_from:hex(c.color_from),color_to:hex(c.color_to),button:{text:c.button?.text||'',url:c.button?.url||''}}});
  } else if(kind==='about') {
    for(const block of blocks)block.style={column:'1',align:'left'};
    blocks.push({id:'about-text',type:'text',style:{column:'1'},content:{paragraphs:c.paragraphs}});
    blocks.push({id:'about-button',type:'button',style:{column:'1'},content:c.button});
    blocks.push({id:'about-tags',type:'tag_list',style:{column:'2'},content:{title:c.card_title,tags:c.tags,note:c.card_note}});
  } else if(kind==='comparison')blocks.push({id:'comparison-table',type:'table',content:{columns:['Feature',c.our_label,c.other_label],rows:c.rows.map(row=>[row.feature,row.ours,row.others])}});
  else if(kind==='cta')blocks.push({id:'cta-content',type:'call_to_action',content:{title:section.title||'',description:c.description,button:c.button}});
  else if(kind.startsWith('builder_')) {
    const type={builder_text:'text',builder_image:'text',builder_cards:'cards',builder_table:'table',builder_faq:'faq',builder_cta:'call_to_action'}[kind];
    if(!type)throw new Error('Unsupported custom section conversion');
    if(kind==='builder_cta') {
      const heading=blocks.findIndex(block=>block.type==='heading');if(heading>=0)blocks.splice(heading,1);
      blocks.push({id:'custom-cta',type,content:{title:section.title||'',description:c.description,button:c.button}});
    } else if(kind==='builder_image') {
      for(const block of blocks)block.style={column:'1',align:'left'};
      blocks.push({id:'custom-text',type:'text',style:{column:'1'},content:{paragraphs:c.paragraphs}});
      blocks.push({id:'custom-image',type:'image',style:{column:'2'},content:{image:c.image,image_alt:c.image_alt}});
    } else blocks.push({id:'custom-content',type,content:kind==='builder_table'?require('../utils/table-content').normalize(c):JSON.parse(JSON.stringify(c))});
  } else {
    const types={features:'feature_cards',countdown:'countdown',steps:'steps',plans:'plans',wheel:'wheel',testimonials:'testimonials',faq:'faq'};
    if(!types[kind])throw new Error('Unsupported homepage conversion');
    const content=JSON.parse(JSON.stringify(c));delete content.anchor;
    if(kind==='wheel')content.prizes=content.prizes.map(prize=>({...prize,color:/^#[0-9a-f]{3}$/i.test(prize.color)?'#'+prize.color.slice(1).split('').map(c=>c+c).join(''):prize.color}));
    blocks.push({id:kind+'-content',type:types[kind],style:{align:['countdown','wheel'].includes(kind)?'center':'left'},content});
  }
  const anchor=c.anchor||({steps:'how',cta:'signup'}[kind])||'';
  return {eyebrow:'',title:'',subtitle:'',is_visible:section.is_visible,content:{...(anchor?{anchor}:{}),layout:{columns:['about','builder_image'].includes(kind)?2:1,padding:kind==='stats'?'small':'normal',gap:'normal',align:kind==='about'?'left':'center',vertical_align:'center'},blocks}};
};
