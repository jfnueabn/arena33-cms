module.exports = async function migrateLocales(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS section_translations (
    section_key VARCHAR(40) NOT NULL, locale VARCHAR(2) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '', eyebrow VARCHAR(120) NOT NULL DEFAULT '', subtitle TEXT NULL,
    content JSON NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (section_key, locale),
    FOREIGN KEY (section_key) REFERENCES sections(section_key) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await conn.query(`CREATE TABLE IF NOT EXISTS page_translations (
    slug VARCHAR(64) NOT NULL, locale VARCHAR(2) NOT NULL, content JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (slug, locale), FOREIGN KEY (slug) REFERENCES landing_pages(slug) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [columns] = await conn.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'section_revisions'");
  if (!columns.some(c => c.COLUMN_NAME === 'locale')) await conn.query("ALTER TABLE section_revisions ADD COLUMN locale VARCHAR(2) NOT NULL DEFAULT 'en'");
};
