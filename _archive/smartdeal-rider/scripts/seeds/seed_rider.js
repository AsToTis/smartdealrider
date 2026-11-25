const mysql = require('C:/smartdeal/node_modules/mysql2/promise');
const bcrypt = require('C:/smartdeal/node_modules/bcryptjs'); // สมมติว่าในโปรเจกต์ใช้ bcryptjs หรือ bcrypt

async function seedRider() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_deal_db'
  });

  try {
    let passwordHash = "123456";
    try {
      passwordHash = await bcrypt.hash("123456", 10);
    } catch (err) {
      console.log('Bcrypt might not be available, using plain text password (if your system supports fallback).');
    }

    // 1. สร้างบัญชี User (ใช้ Role 'driver' ตาม schema ในฐานข้อมูล)
    const [userResult] = await connection.execute(
      'INSERT INTO users (email, phone, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?, "active")',
      ['rider@test.com', '0899999999', passwordHash, 'ไรเดอร์ สายฟ้า', 'driver']
    );
    const userId = userResult.insertId;
    console.log(`✅ สร้าง User สำเร็จ! (User ID: ${userId})`);

    // 2. สร้างข้อมูล Rider
    await connection.execute(
      `INSERT INTO riders 
      (user_id, vehicle_type, license_plate, rider_status, name, phone, status, vehicle_plate, real_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        'รถจักรยานยนต์', 
        'กท 9999', 
        'offline', 
        'ไรเดอร์ สายฟ้า', 
        '0899999999', 
        'approved', 
        'กท 9999', 
        'นายสายฟ้า พาเพลิน'
      ]
    );
    console.log(`✅ สร้างโปรไฟล์ Rider สำเร็จ!`);
    console.log(`\n🎉 ทดสอบ Login ได้ด้วยอีเมล: rider@test.com / รหัสผ่าน: 123456`);
    
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาด:', err);
  } finally {
    await connection.end();
  }
}

seedRider();
