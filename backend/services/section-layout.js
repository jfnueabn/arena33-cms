const defaults={columns:1,variant:'plain',width:'standard',padding:'normal',gap:'normal',background_color:'',background_image:'',text_color:'',align:'center',vertical_align:'start'};
const blockDefaults={column:'auto',align:'left',width:'full',font_size:'normal',color:'',background:'',padding:'none',radius:'normal'};
const color=value=>typeof value==='string' && (value==='' || /^#[0-9a-f]{6}$/i.test(value));
function validLayout(value) {
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v={...defaults,...value};
  return ['plain','hero'].includes(v.variant)&&[1,2,3].includes(v.columns)&&['standard','wide','narrow'].includes(v.width)&&['small','normal','large'].includes(v.padding)&&['small','normal','large'].includes(v.gap)&&
    color(v.background_color)&&color(v.text_color)&&typeof v.background_image==='string'&&(v.background_image===''||/^(https?:\/\/|\/(?!\/))[^\s]*$/i.test(v.background_image))&&
    ['left','center','right'].includes(v.align)&&['start','center','end'].includes(v.vertical_align);
}
function validBlock(value) {
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const v={...blockDefaults,...value};
  return ['auto','1','2','3','full'].includes(v.column)&&['left','center','right'].includes(v.align)&&['full','narrow'].includes(v.width)&&['small','normal','large'].includes(v.font_size)&&
    color(v.color)&&color(v.background)&&['none','small','normal','large'].includes(v.padding)&&['none','normal','round'].includes(v.radius);
}
function groups(blocks,columns) {
  const result=[];let group=null,index=0;
  for(const block of blocks) {
    if(block.style?.column==='full') {group=null;index=0;result.push({full:true,columns:[[block]]});continue;}
    if(!group){group={full:false,columns:Array.from({length:columns},()=>[])};result.push(group);}
    const chosen=Number(block.style?.column);
    group.columns[chosen>=1?Math.min(chosen,columns)-1:index++%columns].push(block);
  }
  return result;
}
module.exports={defaults,blockDefaults,validLayout,validBlock,groups};
