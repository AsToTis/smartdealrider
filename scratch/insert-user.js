const mysql = require('mysql2'); 
const bcrypt = require('bcryptjs'); 

const db = mysql.createConnection({ 
  host: 'localhost', 
  user: 'root', 
  password: '', 
  database: 'smart_deal_db' 
});

async function run() {
  const hash = await bcrypt.hash('123456password', 10);
  db.query('INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', 
    ['MSU User', '66011211049@msu.ac.th', '0800000000', hash, 'buyer'], 
    (err, results) => {
      if (err) console.error('Error:', err.message);
      else console.log('User inserted successfully!');
      db.end();
    }
  );
}
run();
