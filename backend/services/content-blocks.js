const definitions = [
  {type:'match_preview',name:'Match preview',content:{preview_label:'Match preview',preview_note:'Illustrative information only.',matches:[{league:'',home:'',away:'',score:'',status:'',markets:[{label:'',value:''}]}]}},
  {type:'highlights',name:'Highlights',content:{items:[{label:'',value:''}]}},
  {type:'sport_categories',name:'Sport category cards',content:{items:[{title:'',icon:'⚽',badge:'',description:'',tags:[''],image:'',image_alt:'',visible:true}]}},
  {type:'breadcrumb',name:'Breadcrumb',content:{items:[{label:'Home',url:'/'},{label:'Page',url:''}]}},
  {type:'bonus_reward_card',name:'Bonus reward card',content:{gift:'🎁',sample_label:'',card_label:'',card_value:'',card_description:'',highlights:[{label:'',value:''}],target_date:'',countdown_label:'Offer ends in',countdown_empty:'Check the current offer period with our team.'}},
  {type:'bonus_offers',name:'Bonus offers',content:{offers:[{title:'',icon:'🎁',badge:'',benefit:'',description:'',image:'',image_alt:'',button:{text:'',url:''},visible:true}]}},
  {type:'bullet_list',name:'Bullet list',content:{items:['']}},
  {type:'bonus_cta',name:'Bonus call to action',content:{label:'Your next step',title:'',description:'',button:{text:'',url:''},secondary_button:{text:'',url:''},note:''}},
  {type:'game_collection',name:'Game collection',content:{games:[{name:'',category:'',icon:'🎮',description:'',badge:'',image:'',image_alt:'',url:'',visible:true}]}},
  {type:'game_visual',name:'Game collection visual',content:{image:'',image_alt:'',label:'The collection',icons:['🎮','🃏','⚽','🎡'],caption:'Discover. Explore. Find your favourite.'}},
  {type:'providers',name:'Game providers',content:{title:'',eyebrow:'',subtitle:'',providers:['']}},
  {type:'notice',name:'Notice',content:{text:''}},
  {type:'tag_list',name:'Tag list',content:{title:'',tags:[''],note:''}},
  {type:'feature_cards',name:'Feature cards',content:{items:[{icon:'',title:'',description:''}]}},
  {type:'countdown',name:'Countdown',content:{description:'',target_date:'',button:{text:'',url:''}}},
  {type:'steps',name:'How it works / Steps',content:{items:[{title:'',description:''}]}},
  {type:'plans',name:'Membership plans',content:{items:[{name:'',badge:'',price:'',period:'',featured:false,features:[{text:'',included:true}],button:{text:'',url:''}}]}},
  {type:'wheel',name:'Bonus wheel',content:{button_text:'Spin',prizes:[{label:'',color:'#6366f1'}]}},
  {type:'testimonials',name:'Testimonials',content:{items:[{name:'',location:'',rating:5,quote:''}],note:''}},
  {type:'call_to_action',name:'Call to action',content:{title:'',description:'',button:{text:'',url:''}}},
  {type:'counters',name:'Stats counters',content:{items:[{value:0,suffix:'',label:''}]}},
  {type:'promo_banner',name:'Promo banner',content:{banner_title:'',banner_text:'',color_from:'#7c3aed',color_to:'#db2777',button:{text:'',url:''}}},
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
  if(content.anchor!==undefined&&(typeof content.anchor!=='string'||!/^([a-zA-Z][a-zA-Z0-9_-]{0,63})?$/.test(content.anchor)))return false;
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
    if(block.type==='wheel'&&(!Array.isArray(block.content?.prizes)||block.content.prizes.some(prize=>!/^#[0-9a-f]{6}$/i.test(prize.color))))return false;
    if(block.type==='testimonials'&&(!Array.isArray(block.content?.items)||block.content.items.some(item=>!Number.isFinite(item.rating)||item.rating<0||item.rating>5)))return false;
    if(block.type==='counters')return Array.isArray(block.content?.items)&&block.content.items.length<=200&&block.content.items.every(item=>Number.isFinite(item.value)&&typeof item.suffix==='string'&&typeof item.label==='string');
    if(block.type==='promo_banner')return matches(block.content,definition.content)&&['color_from','color_to'].every(key=>/^#[0-9a-f]{6}$/i.test(block.content[key]));
    if(block.type==='hero_visual')return ['image','image_alt','emoji'].every(key=>typeof block.content?.[key]==='string')&&Array.isArray(block.content.tags)&&block.content.tags.length<=200&&block.content.tags.every(require('../utils/hero-tags').valid);
    return block.type==='table'?require('../utils/table-content').valid(block.content):matches(block.content,definition.content);
  });
}
module.exports={definitions,valid};
