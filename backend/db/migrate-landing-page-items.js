const convert=require('../services/landing-page-items');
const {hash,sectionSource}=require('../utils/translation-source');
module.exports=async function migrate(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS cms_migration_backups (
    migration_key VARCHAR(80) PRIMARY KEY,snapshot JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [sections]=await conn.query("SELECT section_key FROM sections WHERE page_slug IN ('sports-betting','virtual-sports','sports','match-odds','baccarat') AND template IN ('sports_hero','games_hero','games_guides','games_about','sports_categories','sports_markets','bonus_about','steps','bonus_terms','faq','bonus_cta','odds_examples')");
  for(const {section_key:key} of sections) {
    await conn.beginTransaction();
    try {
      const [[section]]=await conn.query("SELECT * FROM sections WHERE section_key=? AND page_slug IN ('sports-betting','virtual-sports','sports','match-odds','baccarat') FOR UPDATE",[key]);
      if(!section||section.template==='builder_section'){await conn.commit();continue;}
      const [translations]=await conn.query('SELECT * FROM section_translations WHERE section_key=?',[key]);
      const [revisions]=await conn.query('SELECT * FROM section_revisions WHERE section_key=?',[key]);
      const originalHash=hash(sectionSource({...section,content:typeof section.content==='string'?JSON.parse(section.content):section.content}));
      const converted=convert(section),sourceHash=hash(sectionSource(converted));
      if(!require('../services/content-blocks').valid(converted.content))throw new Error('Invalid converted content: '+key);
      await conn.query('INSERT IGNORE INTO cms_migration_backups (migration_key,snapshot) VALUES (?,?)',['landing-' +key+'-items-v1',JSON.stringify({section,translations,revisions})]);
      await conn.query("UPDATE sections SET template='builder_section',title='',eyebrow='',subtitle='',content=? WHERE section_key=?",[JSON.stringify(converted.content),key]);
      for(const translation of translations) {
        const localized=convert({...section,...translation});
        await conn.query("UPDATE section_translations SET title='',eyebrow='',subtitle='',content=?,source_hash=? WHERE section_key=? AND locale=?",[JSON.stringify(localized.content),translation.source_hash===originalHash?sourceHash:null,key,translation.locale]);
      }
      for(const revision of revisions) {
        const snapshot=typeof revision.snapshot==='string'?JSON.parse(revision.snapshot):revision.snapshot;
        if(!Array.isArray(snapshot.content?.blocks))await conn.query('UPDATE section_revisions SET snapshot=? WHERE id=?',[JSON.stringify(convert({...snapshot,template:section.template,section_key:section.section_key})),revision.id]);
      }
      await conn.commit();console.log('• Landing page '+key+' converted to editable content items (original backed up)');
    } catch(error){await conn.rollback();throw error;}
  }
};
