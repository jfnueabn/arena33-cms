require('dotenv').config();
const db = require('../db');
const service = require('../services/automatic-translations');
(async () => {
  for (const page of await db.getPages()) {
    const result = await service.syncPage(page.slug);
    console.log(page.slug, result.status, result.message || '');
    if (result.status !== 'complete') process.exitCode = 1;
  }
  for (const section of await db.getSections(null)) {
    const result = await service.syncSection(section.section_key);
    console.log(section.section_key, result.status, result.message || '');
    if (result.status !== 'complete') process.exitCode = 1;
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  require('../services/offline-worker').stop();
  await db.pool.end();
});
