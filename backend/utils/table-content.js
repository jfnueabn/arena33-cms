// Upgrade the original two-column template on read, including older revisions.
function normalize(content) {
  if (content && !Array.isArray(content.columns) && typeof content.first_column === 'string' && typeof content.second_column === 'string' && Array.isArray(content.rows)) {
    return {columns:[content.first_column,content.second_column],rows:content.rows.map(row=>[row.label,row.value])};
  }
  return content;
}
function valid(content) {
  return content && Array.isArray(content.columns) && content.columns.length >= 1 && content.columns.length <= 12 &&
    content.columns.every(column=>typeof column==='string') && Array.isArray(content.rows) && content.rows.length <= 200 &&
    content.rows.every(row=>Array.isArray(row) && row.length===content.columns.length && row.every(cell=>typeof cell==='string'));
}
module.exports = { normalize,valid };
