const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'smart_deal_db'
  });

  const dummyIssues = [
    { order_id: 480, user_id: 3, issue_topic: 'อาหารที่ได้รับไม่ตรงกับที่สั่ง', issue_detail: 'สั่งสลัดไปแต่ได้ข้าวผัดมาแทนครับ รบกวนตรวจสอบให้ด้วยครับ', status: 'pending' },
    { order_id: 477, user_id: 3, issue_topic: 'อาหารหกเลอะเทอะในถุง', issue_detail: 'น้ำซุปหกเต็มถุงเลยครับ ไม่สามารถทานได้เลย', status: 'investigating' },
    { order_id: 478, user_id: 2, issue_topic: 'พนักงานจัดส่งพูดจาไม่สุภาพ', issue_detail: 'ไรเดอร์โทรมาโวยวายว่าหาบ้านไม่เจอและพูดจาไม่ดีครับ', status: 'resolved' },
    { order_id: 481, user_id: 4, issue_topic: 'อาหารมีรสชาติบูด', issue_detail: 'แกงส้มมีกลิ่นเปรี้ยวแปลกๆ และรสชาติเหมือนบูดครับ ไม่กล้าทานต่อ', status: 'pending' },
    { order_id: 479, user_id: 5, issue_topic: 'รอนานเกินไป', issue_detail: 'สั่งไป 2 ชั่วโมงแล้วเพิ่งมาส่ง อาหารเย็นหมดเลย', status: 'investigating' }
  ];

  for (const issue of dummyIssues) {
    await conn.query(
      'INSERT INTO order_issues (order_id, user_id, issue_topic, issue_detail, status) VALUES (?, ?, ?, ?, ?)',
      [issue.order_id, issue.user_id, issue.issue_topic, issue.issue_detail, issue.status]
    );
  }

  console.log('Seeded 5 dummy order_issues');
  process.exit(0);
}

run();
