const fs = require('fs');

const serverPath = 'c:\\smartdeal\\server.js';
let code = fs.readFileSync(serverPath, 'utf8');

code = code.replace("COALESCE(s.bank_name, r.bank_name) as bank_name,", "COALESCE(s.bank_name, 'ยังไม่ได้ระบุ') as bank_name,");
code = code.replace("COALESCE(s.bank_account, r.bank_account) as bank_account,", "COALESCE(s.bank_account, u.phone) as bank_account,");

fs.writeFileSync(serverPath, code, 'utf8');
console.log('Fixed bank_name SQL error');
