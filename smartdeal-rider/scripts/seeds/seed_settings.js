const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'smart_deal_db'
  });

  // Create table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      description VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Default settings
  const defaults = [
    // Financials
    ['platform_fee_percent', '15', 'financial', 'เปอร์เซ็นต์ GP ที่หักจากร้านค้า (%)'],
    ['base_delivery_fee', '35', 'financial', 'ค่าจัดส่งเริ่มต้น (บาท)'],
    ['per_km_fee', '8', 'financial', 'ค่าจัดส่งต่อกิโลเมตร (บาท)'],
    ['rider_commission_percent', '100', 'financial', 'ส่วนแบ่งค่าส่งให้ไรเดอร์ (%)'],
    ['minimum_order_value', '50', 'financial', 'ยอดสั่งซื้อขั้นต่ำ (บาท)'],
    
    // Operations
    ['max_delivery_radius_km', '15', 'operation', 'ระยะทางจัดส่งสูงสุด (กิโลเมตร)'],
    ['auto_cancel_minutes', '15', 'operation', 'ยกเลิกออเดอร์อัตโนมัติหากไม่มีไรเดอร์รับ (นาที)'],
    ['system_open', 'true', 'operation', 'เปิดรับออเดอร์ (true/false)'],
    ['maintenance_mode', 'false', 'operation', 'เปิดโหมดซ่อมบำรุงระบบ (แอปจะใช้งานไม่ได้)'],
    
    // App Info
    ['app_name', 'Smart Deal', 'info', 'ชื่อแอปพลิเคชัน'],
    ['support_email', 'support@smartdeal.com', 'info', 'อีเมลติดต่อฝ่ายซัพพอร์ต'],
    ['support_phone', '02-123-4567', 'info', 'เบอร์โทรศัพท์ติดต่อฉุกเฉิน'],
    ['facebook_url', 'https://facebook.com/smartdeal', 'info', 'ลิงก์ Facebook Page'],
  ];

  for (const [key, value, category, desc] of defaults) {
    await conn.query(`
      INSERT INTO system_settings (setting_key, setting_value, category, description) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), category = VALUES(category), description = VALUES(description)
    `, [key, value, category, desc]);
  }

  console.log('Created and seeded system_settings table');
  process.exit(0);
}

run().catch(console.error);
