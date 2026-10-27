const db = require('../db');
const defaults = require('../db/defaults');

exports.bootstrap = async (req, res, next) => {
  try {
    const [settings, sections, pages] = await Promise.all([db.getSettings(), db.getSections(null, req.locale), db.getPages(req.locale)]);
    res.json({
      admin: req.session.admin,
      settings,
      sections,
      pages,
      locale: req.locale,
      locales: require('../utils/locales').locales,
      automatic_translation: { engine:'offline', available:require('../services/offline-worker').available() },
      section_templates: require('../services/section-library'),
      content_blocks: require('../services/content-blocks').definitions,
      section_layout: require('../services/section-layout').defaults, block_style: require('../services/section-layout').blockDefaults,
      defaults: { ...Object.fromEntries(defaults.sections.map(s => [s.section_key, s.content])),
        ...Object.fromEntries(require('../db/landing-section-defaults').map(s => [s.section_key, s.content])) }
    });
  } catch (err) { next(err); }
};
