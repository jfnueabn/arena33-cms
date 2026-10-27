const positions=['top','middle','bottom'];
const aligns=['left','center','right'];
const sizes=['small','normal','large'];
const color=value=>typeof value==='string'&&(value===''||/^#[0-9a-f]{6}$/i.test(value));
function valid(tag) {
  if(typeof tag==='string')return true;
  if(!tag||typeof tag!=='object'||typeof tag.text!=='string')return false;
  const style=tag.style===undefined?{}:tag.style;
  return style&&typeof style==='object'&&!Array.isArray(style)&&
    (style.position===undefined||positions.includes(style.position))&&
    (style.align===undefined||aligns.includes(style.align))&&
    (style.size===undefined||sizes.includes(style.size))&&
    (style.color===undefined||color(style.color))&&
    (style.background===undefined||color(style.background));
}
function normalize(tag,index=0) {
  const source=typeof tag==='string'?{text:tag}:tag;
  const style=source.style||{};
  return {text:source.text,style:{
    position:positions.includes(style.position)?style.position:index===0?'top':'bottom',
    align:aligns.includes(style.align)?style.align:index===0?'left':'right',
    size:sizes.includes(style.size)?style.size:'normal',
    color:color(style.color)?style.color:'',background:color(style.background)?style.background:''
  }};
}
module.exports={valid,normalize};
