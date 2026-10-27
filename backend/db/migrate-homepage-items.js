const convert=require('../services/homepage-items');
const {hash,sectionSource}=require('../utils/translation-source');
module.exports=async function migrate(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS cms_migration_backups (
    migration_key VARCHAR(80) PRIMARY KEY, snapshot JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const customTemplates=['builder_text','builder_image','builder_cards','builder_table','builder_faq','builder_cta'];
  const [custom]=await conn.query("SELECT section_key FROM sections WHERE page_slug='home' AND template IN (?,?,?,?,?,?)",customTemplates);
  for(const key of ['stats','promo','about','features','countdown','steps','comparison','plans','wheel','testimonials','faq','cta',...custom.map(section=>section.section_key)]) {
    await conn.beginTransaction();
    try {
      const [[section]]=await conn.query("SELECT * FROM sections WHERE section_key=? AND page_slug='home' FOR UPDATE",[key]);
      if(!section||(section.template!==key&&!customTemplates.includes(section.template))){await conn.commit();continue;}
      const kind=section.template;
      const [translations]=await conn.query('SELECT * FROM section_translations WHERE section_key=?',[key]);
      const [revisions]=await conn.query('SELECT * FROM section_revisions WHERE section_key=?',[key]);
      await conn.query('INSERT IGNORE INTO cms_migration_backups (migration_key,snapshot) VALUES (?,?)',['homepage-'+key+'-items-v1',JSON.stringify({section,translations,revisions})]);
      const originalHash=hash(sectionSource({...section,content:typeof section.content==='string'?JSON.parse(section.content):section.content}));
      const converted=convert(section,kind), sourceHash=hash(sectionSource(converted));
      await conn.query("UPDATE sections SET template='builder_section',title='',eyebrow='',subtitle='',content=? WHERE section_key=?",[JSON.stringify(converted.content),key]);
      for(const translation of translations) {
        const localized=convert({...section,...translation},kind);
        await conn.query("UPDATE section_translations SET title='',eyebrow='',subtitle='',content=?,source_hash=? WHERE section_key=? AND locale=?",[JSON.stringify(localized.content),translation.source_hash===originalHash?sourceHash:null,key,translation.locale]);
      }
      for(const revision of revisions) {
        const snapshot=typeof revision.snapshot==='string'?JSON.parse(revision.snapshot):revision.snapshot;
        if(!Array.isArray(snapshot.content?.blocks))await conn.query('UPDATE section_revisions SET snapshot=? WHERE id=?',[JSON.stringify(convert(snapshot,kind)),revision.id]);
      }
      await conn.commit();
      console.log('• Homepage '+key+' converted to editable content items (original backed up)');
    } catch(error){await conn.rollback();throw error;}
  }
};
