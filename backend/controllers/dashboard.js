const db = require('../db');
const defaults = require('../db/defaults');

exports.bootstrap = async (req, res, next) => {
  try {
    const [settings, sections] = await Promise.all([db.getSettings(), db.getSections()]);
    res.json({
      admin: req.session.admin,
      settings,
      sections,
      defaults: Object.fromEntries(defaults.sections.map(s => [s.section_key, s.content]))
    });
  } catch (err) { next(err); }
};
