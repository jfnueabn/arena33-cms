// Insert a new landing page and its sections without replacing saved edits.
module.exports = async function seedLandingPage(conn, page) {
  await conn.beginTransaction();
  try {
    const [result] = await conn.query('INSERT IGNORE INTO landing_pages (slug, title, content) VALUES (?, ?, ?)', [page.slug, page.title, JSON.stringify(page.content)]);
    for (const [i, s] of page.sections.entries()) {
      await conn.query(
        'INSERT IGNORE INTO sections (section_key, page_slug, template, name, title, eyebrow, subtitle, content, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.section_key, page.slug, s.template, s.name, s.title, s.eyebrow, s.subtitle, JSON.stringify(s.content), (i + 1) * 10]
      );
    }
    if (result.affectedRows) {
      const [[header]] = await conn.query("SELECT content FROM sections WHERE section_key = 'header' FOR UPDATE");
      if (header) {
        const content = typeof header.content === 'string' ? JSON.parse(header.content) : header.content;
        if (!content.nav.some(link => link.url === '/' + page.slug)) {
          content.nav.push({ label: page.name, url: '/' + page.slug });
          await conn.query("UPDATE sections SET content = ? WHERE section_key = 'header'", [JSON.stringify(content)]);
        }
      }
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; }
};
