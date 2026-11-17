// Extract the `var data = {...}` JSON object from a Simpleview page (balanced-brace scan).
module.exports = function extractData(html) {
  const i = html.search(/var data\s*=\s*\{/); if (i < 0) return null;
  let s = html.indexOf('{', i), depth = 0, inStr = false, esc = false;
  for (let j = s; j < html.length; j++) {
    const ch = html[j];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(html.slice(s, j + 1)); } catch { return null; } } }
  }
  return null;
};
