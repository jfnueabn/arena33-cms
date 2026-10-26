const db = require('../db');
const SETTING_KEYS = Object.keys(require('../db/defaults').settings);

exports.update = async (req, res, next) => {
  try {
    const input = req.body.settings || {};
    for (const key of SETTING_KEYS) {
      if (key in input) {
        await db.pool.query(
          'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
          [key, String(input[key]).slice(0, 2000)]
        );
      }
    }
    res.json({ settings: await db.getSettings() });
  } catch (err) { next(err); }
};
