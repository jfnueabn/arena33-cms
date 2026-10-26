const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const publicDirectory = path.join(__dirname, '..', '..', 'public');

// Called when rendering a page so edits take effect without restarting the server.
module.exports = function assetUrl(filename) {
  const content = fs.readFileSync(path.join(publicDirectory, filename));
  const version = createHash('sha256').update(content).digest('hex').slice(0, 12);
  return `/${filename}?v=${version}`;
};
