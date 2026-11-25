const fs = require('fs');
let content = fs.readFileSync('C:\\smartdeal\\smart-deal-backend\\src\\db.js', 'utf8');

const oldConfig = `const db = mysql.createPool({
  host: process.env.DB_HOST || '202.28.34.205',
  user: process.env.DB_USER || 'usr244',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'pwdproject244',
  database: process.env.DB_NAME || 'db244',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});`;

const newConfig = `const db = mysql.createPool({
  host: process.env.DB_HOST || '202.28.34.205',
  user: process.env.DB_USER || 'usr244',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'pwdproject244',
  database: process.env.DB_NAME || 'db244',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Fix Date serialization to return strings instead of {}
});`;

if (content.includes(oldConfig)) {
    content = content.replace(oldConfig, newConfig);
    fs.writeFileSync('C:\\smartdeal\\smart-deal-backend\\src\\db.js', content);
    console.log('Added dateStrings: true to db.js!');
} else {
    console.log('Could not find the config to replace!');
}
