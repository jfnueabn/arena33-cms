module.exports=function breadcrumbs(page,header,sections,locale='en') {
  const custom=sections.flatMap(section=>section.content.blocks||[]).find(block=>block.type==='breadcrumb');
  if(custom?.content.items.length)return {automatic:false,renderAtTop:true,items:custom.content.items};
  if(page.slug==='home')return {automatic:false,renderAtTop:false,items:[]};
  const nav=header?.content.nav||[];
  const item=nav.find(link=>String(link.url||'').split(/[?#]/)[0].replace(/^\/(en|ms|zh)(?=\/|$)/,'').replace(/^\/|\/$/g,'')===page.slug);
  const t=text=>require('../utils/ui-translations')(text,locale);
  return {automatic:true,renderAtTop:true,items:[{label:t('Home'),url:'/'},{label:item?.label||t(page.name||page.title),url:''}]};
};
