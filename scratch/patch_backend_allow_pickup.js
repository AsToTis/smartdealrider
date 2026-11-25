const fs = require('fs');
const serverPath = 'C:/smartdeal/smart-deal-backend/src/server.js';
let s = fs.readFileSync(serverPath, 'utf8');

const targetStr = "    const currentOrderStatus = orderRows[0].order_status;\n    if (currentOrderStatus !== 'ready' && currentOrderStatus !== 'delivering') {\n      await connection.rollback();\n      return res.status(400).json({ \n        success: false, \n        message: 'ร้านค้ายังเตรียมสินค้าไม่เสร็จ หรือยังไม่ได้กดยืนยันพร้อมส่งสินค้า กรุณารอสักครู่' \n      });\n    }";

const replacement = "    // เมื่อไรเดอร์ถ่ายรูปยืนยันรับสินค้า สามารถรับสินค้าและเปลี่ยนสถานะเป็น delivering ได้ทันที\n    const currentOrderStatus = orderRows[0].order_status;";

if (s.includes(targetStr)) {
  s = s.replace(targetStr, replacement);
  fs.writeFileSync(serverPath, s, 'utf8');
  console.log('✅ Backend pickup check removed successfully');
} else {
  // Regex approach
  const regex = /const currentOrderStatus = orderRows\[0\]\.order_status;\s*if\s*\(currentOrderStatus !== 'ready' && currentOrderStatus !== 'delivering'\)\s*\{\s*await connection\.rollback\(\);\s*return res\.status\(400\)[\s\S]*?\}\s*\}/;
  if (regex.test(s)) {
    s = s.replace(regex, "const currentOrderStatus = orderRows[0].order_status;");
    fs.writeFileSync(serverPath, s, 'utf8');
    console.log('✅ Backend pickup check replaced via regex');
  } else {
    console.log('⚠️ Could not match backend check');
  }
}
