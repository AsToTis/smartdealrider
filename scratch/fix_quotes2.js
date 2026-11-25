const fs = require('fs');
const path = require('path');
const dir = 'C:\\smartdealadmin\\src\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const full = path.join(dir, file);
  let content = fs.readFileSync(full, 'utf8');
  
  // Fix the damage caused by my aggressive regex
  // Damage: normalizedPath.startsWith(`/') ? '' : '/'
  // Or: selectedShop.bookbank_image.startsWith(`/')
  
  content = content.replace(/startsWith\(\`\/'\)/g, "startsWith('/')");
  content = content.replace(/startsWith\(\`http'\)/g, "startsWith('http')");
  
  // Any other damage?
  // `${import.meta.env.VITE_API_URL}${selectedShop.bookbank_image.startsWith(`/') ? '' : '/'}${selectedShop.bookbank_image.replace(/\\/g, '/')}`}
  // The original was: `http://localhost:5000${...}`
  
  // Wait, did it mess up the trailing backtick of the entire expression?
  // Let's just fix it by replacing the whole `getImageUrl` function if it's messed up,
  // but it's easier to just fix the startsWith quote and see if it builds.
  // Actually, the error says:
  // return `${import.meta.env.VITE_API_URL}${normalizedPath.startsWith(`/') ? '' : '/'}${normalizedPath}`;
  // If I change `/')` to `'/')`, it will fix the syntax.
  
  content = content.replace(/startsWith\(`\/'\)/g, "startsWith('/')");

  fs.writeFileSync(full, content);
}
console.log('Fixed startsWith quotes in admin app');
