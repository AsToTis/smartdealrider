const fs = require('fs');
let code = fs.readFileSync('c:/smartdealrider/smartdeal-rider/Settings.jsx', 'utf8');

code = code.replace(/{\\\`/g, '{`');
code = code.replace(/\\`}/g, '`}');
code = code.replace(/\\`/g, '`');

fs.writeFileSync('c:/smartdealrider/smartdeal-rider/Settings.jsx', code);
console.log('Fixed backticks in Settings.jsx');
