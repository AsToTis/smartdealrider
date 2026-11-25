const fs = require('fs');
const lines = fs.readFileSync('C:/smartdeal/smart-deal-backend/src/server.js', 'utf8').split('\n');
for (let i = 3860; i < Math.min(lines.length, 3915); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
