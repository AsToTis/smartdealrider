const fs = require('fs');
const path = require('path');

const p = path.resolve(__dirname, 'node_modules', 'metro-cache', 'package.json');
if (fs.existsSync(p)) {
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (data.exports) {
    delete data.exports;
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log('Fixed metro-cache exports for Node.js 24 compatibility');
  }
} else {
  console.log('metro-cache not found, skipping patch');
}
