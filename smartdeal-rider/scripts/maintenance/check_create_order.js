const fs = require('fs');

try {
  const content = fs.readFileSync('C:/smartdeal/server.js', 'utf8');
  const lines = content.split('\n');
  console.log(lines.slice(1000, 1080).join('\n'));
} catch (e) {
  console.log(e.message);
}
