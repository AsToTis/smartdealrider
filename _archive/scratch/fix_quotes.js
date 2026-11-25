const fs = require('fs');
const path = require('path');
const dir = 'C:\\smartdealadmin\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const full = path.join(dir, file);
  let content = fs.readFileSync(full, 'utf8');
  
  // My previous script replaced: 'http://localhost:5000/api'
  // With: `${import.meta.env.VITE_API_URL}/api'
  // So it starts with a backtick but ends with a single quote or double quote.
  // I need to change the trailing ' or " to a backtick `
  
  // It looks like: `${import.meta.env.VITE_API_URL}/api/admin/riders/pending'
  // or `${import.meta.env.VITE_API_URL}/api/admin/banners/${editingId}`
  // If it already ends with backtick, it's fine.
  
  // Let's use a regex to match from `${import.meta.env.VITE_API_URL} up to the NEXT quote or backtick.
  // But wait, what if they had template strings like `...${id}...` inside?
  // Let's just fix specifically the ones ending in ' or "
  
  content = content.replace(/(`\$\{import\.meta\.env\.VITE_API_URL\}[^'`"]*)['"]/g, '$1`');
  
  fs.writeFileSync(full, content);
}
console.log('Fixed quotes in admin app');
