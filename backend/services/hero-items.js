// Convert saved hero content, rather than replacing it with starter copy.
module.exports=function heroItems(section) {
  const content=typeof section.content==='string'?JSON.parse(section.content):section.content;
  const left={column:'1'};
  const blocks=[
    {id:'hero-label',type:'badge',style:left,content:{text:section.eyebrow||''}},
    {id:'hero-heading',type:'heading',style:left,content:{text:section.title||'',level:'h1',highlight:content.highlight||''}},
    {id:'hero-description',type:'text',style:left,content:{paragraphs:[content.description||'']}},
    {id:'hero-buttons',type:'buttons',style:left,content:{items:[{...content.primary_button,variant:'primary'},{...content.secondary_button,variant:'outline'}].filter(button=>button.text).map(button=>({text:button.text,url:button.url||'',variant:button.variant}))}},
    {id:'hero-visual',type:'hero_visual',style:{column:'2'},content:{image:content.image||'',image_alt:content.image_alt||'',emoji:'⚽',tags:content.tags||[]}}
  ];
  if(section.subtitle)blocks.splice(3,0,{id:'hero-subtitle',type:'text',style:left,content:{paragraphs:[section.subtitle]}});
  return {eyebrow:'',title:'',subtitle:'',is_visible:section.is_visible,content:{layout:{columns:2,width:'standard',variant:'hero',padding:'normal',gap:'small',align:'left',vertical_align:'center'},blocks}};
};
