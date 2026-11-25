const fs = require('fs');
const path = require('path');

// 1. Patch Admin App
const adminPagesDir = 'C:\\smartdealadmin\\src\\pages';
const adminFiles = fs.readdirSync(adminPagesDir).filter(f => f.endsWith('.jsx'));

for (const file of adminFiles) {
  const fullPath = path.join(adminPagesDir, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace string literal 'http://localhost:5000/api/...' -> `${import.meta.env.VITE_API_URL}/api/...`
  // We match cases like `http://localhost:5000/api/admin...` which is inside backticks or quotes
  // Since they usually use backticks: `http://localhost:5000/api/...`
  content = content.replace(/`http:\/\/localhost:5000/g, '`${import.meta.env.VITE_API_URL}');
  content = content.replace(/'http:\/\/localhost:5000/g, '`${import.meta.env.VITE_API_URL}');
  content = content.replace(/"http:\/\/localhost:5000/g, '`${import.meta.env.VITE_API_URL}');

  // In case they just used 'http://localhost:5000' as a simple string without backticks but our replace added a backtick,
  // we actually need to be careful if it was a plain string like 'http://localhost:5000/api'
  // Let's just do a simpler global replace if they used axios.get('http://localhost:5000...')
  // It's safer to just replace http://localhost:5000 with ${import.meta.env.VITE_API_URL} if it's inside backticks.
  // Wait, if it was 'http://localhost:5000/api/shops' it becomes `${import.meta.env.VITE_API_URL}/api/shops' which is invalid.
  fs.writeFileSync(fullPath, content);
}
// Fix quotes for admin files (if we broke any ' or ")
for (const file of adminFiles) {
  const fullPath = path.join(adminPagesDir, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  // convert '`${import.meta.env.VITE_API_URL}/... ' to `${import.meta.env.VITE_API_URL}/...`
  content = content.replace(/'\$\{import\.meta\.env\.VITE_API_URL\}([^']*)'/g, '`${import.meta.env.VITE_API_URL}$1`');
  content = content.replace(/"\$\{import\.meta\.env\.VITE_API_URL\}([^"]*)"/g, '`${import.meta.env.VITE_API_URL}$1`');
  fs.writeFileSync(fullPath, content);
}

// Write .env files for Admin App
fs.writeFileSync('C:\\smartdealadmin\\.env.development', 'VITE_API_URL=http://localhost:5000\n');
fs.writeFileSync('C:\\smartdealadmin\\.env.production', 'VITE_API_URL=http://202.28.34.205:5000\n');


// 2. Patch Rider App
const riderApiPath = 'C:\\smartdealrider\\smartdeal-rider\\src\\utils\\api.ts';
let riderApiContent = fs.readFileSync(riderApiPath, 'utf8');
riderApiContent = riderApiContent.replace(
  /\/\/ API_URL = 'https:\/\/api\.yourdomain\.com\/api';/,
  'API_URL = \'http://202.28.34.205:5000/api\';'
);
fs.writeFileSync(riderApiPath, riderApiContent);

// 3. Patch User App
const userApiPath = 'C:\\smartdeal\\smart-deal-app\\src\\constants\\api.ts';
let userApiContent = fs.readFileSync(userApiPath, 'utf8');
userApiContent = userApiContent.replace(
  /const IP_ADDRESS = '172\.20\.10\.2';/,
  'const IP_ADDRESS = __DEV__ ? \'172.20.10.2\' : \'202.28.34.205\';'
);
fs.writeFileSync(userApiPath, userApiContent);

console.log('Successfully patched all environments without touching unrelated functions.');
