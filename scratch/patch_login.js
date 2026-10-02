const fs = require('fs');
const path = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
let content = fs.readFileSync(path, 'utf8');

const loginRejectRegex = /if \(rider\.status === 'rejected'\) \{\s*return res\.status\(403\)\.json\({ success: false, message: '[^']*' }\);\s*\}/g;
const newLoginReject = `if (rider.status === 'rejected') {
      return res.status(403).json({ success: false, message: 'บัญชีของคุณถูกปฏิเสธ', status: 'rejected', reason: rider.reject_reason || 'ไม่ระบุเหตุผล' });
    }`;

content = content.replace(loginRejectRegex, newLoginReject);

fs.writeFileSync(path, content);
console.log('Successfully patched rider login in server.js!');
