const db = require('../db');

exports.create = async (req,res,next) => {
  const {name,slug,add_to_header=false}=req.body;
  if(typeof name!=='string'||!name.trim()||name.trim().length>80||!require('../services/page-slug')(slug)||typeof add_to_header!=='boolean')return res.status(400).json({error:'Enter a page name and a unique URL using lowercase letters, numbers and hyphens. Reserved URLs cannot be used.'});
  let conn;
  try {
    conn=await db.pool.getConnection();
    await conn.beginTransaction();
    const content={seo_title:name.trim(),seo_description:'',seo_keywords:'',og_image:'',robots_index:'1'};
    await conn.query('INSERT INTO landing_pages (slug,title,content,is_visible) VALUES (?,?,?,0)',[slug,name.trim(),JSON.stringify(content)]);
    if(add_to_header) {
      const [[header]]=await conn.query("SELECT content FROM sections WHERE section_key='header' FOR UPDATE");
      if(header) {
        const value=db.parseJson(header.content);
        if(!value.nav.some(link=>link.url===('/'+slug)||link.url===('/en/'+slug)||link.url===('/en/'+slug+'/')))value.nav.push({label:name.trim(),url:'/'+slug});
        await conn.query("UPDATE sections SET content=?,updated_by=? WHERE section_key='header'",[JSON.stringify(value),req.session.admin.id]);
      }
    }
    await conn.commit();
    conn.release();conn=null;
    const translator=require('../services/automatic-translations');
    const results=await Promise.all([translator.syncPage(slug),...(add_to_header?[translator.syncSection('header')]:[])]);
    res.status(201).json({page:await db.getPage(slug,'en'),sections:await db.getSections(null,'en'),translation:{status:results.every(r=>r.status==='complete')?'complete':'pending'}});
  } catch(error) {
    if(conn)await conn.rollback();
    if(error.code==='ER_DUP_ENTRY')return res.status(409).json({error:'That page URL already exists. Choose another URL.'});
    next(error);
  } finally {conn?.release();}
};

exports.update = async (req, res, next) => {
  try {
    const page = await db.getPage(req.params.slug, req.locale || 'en');
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const { content, is_visible } = req.body;
    if (!content || typeof content !== 'object' || Array.isArray(content) || typeof is_visible !== 'boolean' ||
        Object.keys(page.content).some(key => typeof content[key] !== 'string') || !['0', '1'].includes(content.robots_index)) {
      return res.status(400).json({ error: 'Invalid page settings' });
    }
    const clean = Object.fromEntries(Object.keys(page.content).map(k => [k, content[k].slice(0, 2000)]));
    // JSON_SET preserves the original migration backup in existing records.
    await db.pool.query(
      "UPDATE landing_pages SET content = JSON_SET(content, '$.seo_title', ?, '$.seo_description', ?, '$.seo_keywords', ?, '$.og_image', ?, '$.robots_index', ?), is_visible = ? WHERE slug = ?",
      [clean.seo_title, clean.seo_description, clean.seo_keywords, clean.og_image, clean.robots_index, is_visible ? 1 : 0, page.slug]
    );
    const translation = await require('../services/automatic-translations').syncPage(page.slug);
    res.json({ page: await db.getPage(page.slug,'en'), translation });
  } catch (err) { next(err); }
};
