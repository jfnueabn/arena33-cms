const convert=require('../services/hero-items');
const {hash,sectionSource}=require('../utils/translation-source');
module.exports=async function migrateHeroItems(conn) {
  const [[hero]]=await conn.query("SELECT * FROM sections WHERE section_key='hero'");
  if(!hero || hero.template!=='hero')return;
  await conn.query(`CREATE TABLE IF NOT EXISTS cms_migration_backups (
    migration_key VARCHAR(80) PRIMARY KEY, snapshot JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await conn.beginTransaction();
  try {
    const [translations]=await conn.query("SELECT * FROM section_translations WHERE section_key='hero'");
    const [revisions]=await conn.query("SELECT * FROM section_revisions WHERE section_key='hero'");
    await conn.query('INSERT IGNORE INTO cms_migration_backups (migration_key,snapshot) VALUES (?,?)',['homepage-hero-items-v1',JSON.stringify({hero,translations,revisions})]);
    const converted=convert(hero);
    await conn.query("UPDATE sections SET template='builder_section',title='',eyebrow='',subtitle='',content=? WHERE section_key='hero'",[JSON.stringify(converted.content)]);
    const sourceHash=hash(sectionSource(converted));
    for(const translation of translations) {
      const localized=convert({...hero,...translation});
      await conn.query("UPDATE section_translations SET title='',eyebrow='',subtitle='',content=?,source_hash=? WHERE section_key='hero' AND locale=?",[JSON.stringify(localized.content),sourceHash,translation.locale]);
    }
    for(const revision of revisions) {
      const snapshot=typeof revision.snapshot==='string'?JSON.parse(revision.snapshot):revision.snapshot;
      if(!Array.isArray(snapshot.content?.blocks))await conn.query('UPDATE section_revisions SET snapshot=? WHERE id=?',[JSON.stringify(convert(snapshot)),revision.id]);
    }
    await conn.commit();
    console.log('• Homepage Hero converted to editable content items (original backed up)');
  } catch(error) {await conn.rollback();throw error;}
};
