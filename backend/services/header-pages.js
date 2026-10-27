const validSlug=require('./page-slug');
const {randomUUID}=require('crypto');
function slugFor(url) {
  if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//'))return null;
  const path=url.split(/[?#]/)[0].replace(/^\/(en|ms|zh)(?=\/|$)/,'').replace(/^\/|\/$/g,'');
  return validSlug(path)?path:null;
}
async function sync(conn,nav,previous,adminId) {
  const old=new Set(previous.map(link=>slugFor(link.url)).filter(Boolean)),changed=[];
  for(const link of nav) {
    if(!link.url||link.url==='#') {
      const slug=String(link.label||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
      if(!validSlug(slug))throw Object.assign(new Error('Enter a valid /page-url for the header link “'+link.label+'”.'),{status:400});
      link.url='/'+slug;
    }
    const slug=slugFor(link.url);if(!slug)continue;
    const [[page]]=await conn.query('SELECT slug FROM landing_pages WHERE slug=? FOR UPDATE',[slug]);
    if(!page) {
      const content={seo_title:link.label,seo_description:'',seo_keywords:'',og_image:'',robots_index:'1'};
      await conn.query('INSERT INTO landing_pages (slug,title,content,is_visible) VALUES (?,?,?,1)',[slug,link.label,JSON.stringify(content)]);
    } else if(old.has(slug))continue;
    else await conn.query('UPDATE landing_pages SET is_visible=1 WHERE slug=?',[slug]);
    const [[existing]]=await conn.query('SELECT section_key FROM sections WHERE page_slug=? LIMIT 1',[slug]);
    if(!existing)await conn.query("INSERT INTO sections (section_key,page_slug,template,name,title,eyebrow,subtitle,content,is_visible,sort_order,updated_by) VALUES (?,?,'builder_section','Blank section','','','',?,1,10,?)",['custom_'+randomUUID().replaceAll('-',''),slug,JSON.stringify({blocks:[]}),adminId]);
    changed.push(slug);
  }
  return [...new Set(changed)];
}
module.exports={slugFor,sync};
