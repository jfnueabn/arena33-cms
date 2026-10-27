const db = require('../db');
const library = require('../services/section-library');
const { randomUUID } = require('crypto');
async function available(req,res) {
  if(req.params.slug==='shared'||!await db.getPage(req.params.slug,'en')) {res.status(404).json({error:'Page not found.'});return false;}
  return true;
}

exports.list = async (req,res,next) => {
  try {
    if (!await available(req,res)) return;
    const [archived] = await db.pool.query("SELECT section_key, name FROM sections WHERE page_slug=? AND is_archived=1 ORDER BY updated_at DESC",[req.params.slug]);
    res.json({templates:library,archived});
  } catch(error) { next(error); }
};

exports.create = async (req,res,next) => {
  try {
    if (!await available(req,res)) return;
    let source;
    if (req.body.source_key) {
      source = await db.getSection(String(req.body.source_key),req.params.slug,'en');
      if (!source || !library.some(item=>item.template===source.template)) return res.status(400).json({error:'Choose a section created with the section builder to duplicate.'});
      source = {...source,name:source.name.slice(0,73)+' (copy)'};
      source.content=JSON.parse(JSON.stringify(source.content));delete source.content.anchor;
    } else source = library.find(item=>item.template===(req.body.template || 'builder_section'));
    if (!source) return res.status(400).json({error:'Choose a valid section template.'});
    if(source.template!=='builder_section')source={...source,...require('../services/homepage-items')(source,source.template),template:'builder_section'};
    const key = 'custom_'+randomUUID().replaceAll('-','');
    // Added sections stay hidden in both public pages and the admin preview until enabled.
    await db.pool.query(`INSERT INTO sections (section_key,page_slug,template,name,title,eyebrow,subtitle,content,is_visible,sort_order,updated_by)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, COALESCE(MAX(sort_order),0)+10, ? FROM sections WHERE page_slug=?`,
      [key,req.params.slug,source.template,source.name,source.title,source.eyebrow,source.subtitle,JSON.stringify(source.content),req.session.admin.id,req.params.slug]);
    const translation = await require('../services/automatic-translations').syncSection(key);
    res.status(201).json({section:await db.getSection(key,req.params.slug,'en'),translation});
  } catch(error) { next(error); }
};

exports.archive = async (req,res,next) => {
  try {
    if (!await available(req,res)) return;
    const section = await db.getSection(req.params.key,req.params.slug,'en');
    if (!section || section.is_fixed) return res.status(400).json({error:'Shared header/footer cannot be deleted.'});
    await db.pool.query("UPDATE sections SET is_archived=1,updated_by=? WHERE section_key=? AND page_slug=?",[req.session.admin.id,section.section_key,req.params.slug]);
    res.json({sections:await db.getSections(null,'en')});
  } catch(error) { next(error); }
};

exports.restore = async (req,res,next) => {
  try {
    if (!await available(req,res)) return;
    const [result] = await db.pool.query("UPDATE sections SET is_archived=0,is_visible=0,updated_by=? WHERE section_key=? AND page_slug=? AND is_archived=1",[req.session.admin.id,req.params.key,req.params.slug]);
    if (!result.affectedRows) return res.status(404).json({error:'Removed section not found.'});
    res.json({section:await db.getSection(req.params.key,req.params.slug,'en')});
  } catch(error) { next(error); }
};
