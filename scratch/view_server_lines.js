const fs = require('fs');
const lines = fs.readFileSync('C:/smartdeal/smart-deal-backend/src/server.js', 'utf8').split('\n');
for (let i = 3850; i < Math.min(lines.length, 3900); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
