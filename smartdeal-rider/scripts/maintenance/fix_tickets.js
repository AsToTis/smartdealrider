const fs = require('fs');
let code = fs.readFileSync('C:/smartdealadmin/src/pages/Tickets.jsx', 'utf8');

// The issue is the file literally contains: className={\`...
// I need to replace it with: className={`...
code = code.replace(/\\`/g, '`');

fs.writeFileSync('C:/smartdealadmin/src/pages/Tickets.jsx', code);
console.log('Fixed backticks in Tickets.jsx');
