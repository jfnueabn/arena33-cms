// Add new editor fields without replacing saved content or array items.
module.exports = function contentDefaults(value, defaults, arrayItem = false) {
  if (Array.isArray(defaults)) {
    if (!Array.isArray(value)) return value === undefined ? defaults : value;
    return defaults.length ? value.map(item => contentDefaults(item, defaults[0], true)) : value;
  }
  if (defaults && typeof defaults === 'object') {
    if (value !== undefined && (!value || typeof value !== 'object')) return value;
    const result = { ...(value || {}) };
    for (const [key, fallback] of Object.entries(defaults)) result[key] = contentDefaults(result[key], fallback, arrayItem);
    return result;
  }
  if (value !== undefined) return value;
  return arrayItem && typeof defaults === 'string' ? '' : defaults;
};
