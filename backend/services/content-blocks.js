const definitions = [
  {type:'badge',name:'Label / Badge',content:{text:''}},
  {type:'buttons',name:'Button group',content:{items:[{text:'',url:'',variant:'primary'}]}},
  {type:'hero_visual',name:'Hero visual',content:{image:'',image_alt:'',emoji:'⚽',tags:[{text:'',style:{position:'top',align:'left',size:'normal',color:'',background:''}}]}},
  {type:'heading',name:'Heading',content:{text:'',level:'h2'}},
  {type:'text',name:'Text',content:{paragraphs:['']}},
  {type:'image',name:'Image',content:{image:'',image_alt:''}},
  {type:'cards',name:'Cards',content:{items:[{title:'',description:''}]}},
  {type:'table',name:'Table',content:{columns:['Column 1','Column 2'],rows:[['','']]}},
  {type:'faq',name:'FAQ',content:{items:[{question:'',answer:''}]}},
  {type:'button',name:'Button',content:{text:'',url:''}}
];
function matches(value,shape) {
  if(Array.isArray(shape))return Array.isArray(value)&&value.length<=200&&value.every(item=>matches(item,shape[0]));
  if(shape&&typeof shape==='object')return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(shape).every(key=>matches(value[key],shape[key]));
  return typeof value===typeof shape;
}
function valid(content) {
  if(!content||!Array.isArray(content.blocks)||content.blocks.length>50)return false;
  if(!require('./section-layout').validLayout(content.layout))return false;
  const ids=new Set();
  return content.blocks.every(block=>{
    const definition=definitions.find(item=>item.type===block.type);
    if(!definition||typeof block.id!=='string'||!/^[a-zA-Z0-9_-]{1,50}$/.test(block.id)||ids.has(block.id))return false;
    if(!require('./section-layout').validBlock(block.style))return false;
    if(block.type==='heading' && !['h1','h2','h3','h4'].includes(block.content?.level))return false;
    if(block.type==='heading' && block.content.highlight!==undefined && typeof block.content.highlight!=='string')return false;
    if(block.type==='buttons' && (!Array.isArray(block.content?.items)||block.content.items.some(item=>!['primary','outline'].includes(item.variant))))return false;
    ids.add(block.id);
    if(block.type==='hero_visual')return ['image','image_alt','emoji'].every(key=>typeof block.content?.[key]==='string')&&Array.isArray(block.content.tags)&&block.content.tags.length<=200&&block.content.tags.every(require('../utils/hero-tags').valid);
    return block.type==='table'?require('../utils/table-content').valid(block.content):matches(block.content,definition.content);
  });
}
module.exports={definitions,valid};
