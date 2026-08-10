const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('src');
let output = [];
// Match fontSize strings/numbers >= 24
const regex = /fontSize:\s*['"]?(\d{2})px['"]?/g;
const regexNum = /fontSize:\s*(\d{2})\b/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    let match;
    let found = false;
    while ((match = regex.exec(line)) !== null) {
      if (parseInt(match[1]) >= 24) found = true;
    }
    while ((match = regexNum.exec(line)) !== null) {
      if (parseInt(match[1]) >= 24) found = true;
    }
    if (found) {
      if (!line.includes('isMobile ?')) {
        output.push(file + ':' + (i + 1) + ' - ' + line.trim());
      }
    }
  });
});
console.log(output.join('\n'));
