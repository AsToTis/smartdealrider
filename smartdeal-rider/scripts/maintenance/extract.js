const fs = require('fs');

const serverJsPath = 'C:\\smartdeal\\server.js';
const code = fs.readFileSync(serverJsPath, 'utf8');

// Use regex to find app.get, app.post, app.put for /api/rider
const regex = /app\.(get|post|put|delete)\('\/api\/riders?[\w/:_-]*'[\s\S]*?\n  \}\);/g;

let matches;
let extracted = '';
while ((matches = regex.exec(code)) !== null) {
  extracted += matches[0] + '\n\n';
}

fs.writeFileSync('C:\\smartdealrider\\smartdeal-rider\\rider_routes.txt', extracted);
console.log('Done');
