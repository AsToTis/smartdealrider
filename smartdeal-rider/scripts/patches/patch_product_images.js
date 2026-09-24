const mysql = require('C:/smartdeal/node_modules/mysql2/promise');

const images = {
  sushi: [
    'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800',
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
    'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=800'
  ],
  bakery: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800',
    'https://images.unsplash.com/photo-1549590143-d5855148a9d5?w=800'
  ],
  salad: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'
  ],
  coffee: [
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800',
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800'
  ],
  thai: [
    'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
    'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=800',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800'
  ],
  steak: [
    'https://images.unsplash.com/photo-1544025162-83b38c2929e0?w=800',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=800'
  ],
  general: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
  ]
};

function getRandomImage(category) {
  const list = images[category] || images.general;
  return list[Math.floor(Math.random() * list.length)];
}

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'smart_deal_db'
  });

  const [products] = await conn.query('SELECT product_id, name FROM products');
  let updatedCount = 0;

  for (const p of products) {
    const name = p.name.toLowerCase();
    let cat = 'general';

    if (name.includes('ซูชิ') || name.includes('แซลมอน') || name.includes('ปลาไหล') || name.includes('ทูน่า') || name.includes('ญี่ปุ่น') || name.includes('ซาซิมิ') || name.includes('เบนโตะ')) {
      cat = 'sushi';
    } else if (name.includes('พาสทรี') || name.includes('ครัวซอง') || name.includes('ขนมปัง') || name.includes('ทาร์ต') || name.includes('เค้ก') || name.includes('เบเกอรี่')) {
      cat = 'bakery';
    } else if (name.includes('สลัด') || name.includes('ควินัว') || name.includes('คลีน') || name.includes('ผลไม้')) {
      cat = 'salad';
    } else if (name.includes('กาแฟ') || name.includes('มัทฉะ') || name.includes('ลาเต้') || name.includes('น้ำ') || name.includes('ชา') || name.includes('เครื่องดื่ม')) {
      cat = 'coffee';
    } else if (name.includes('ข้าว') || name.includes('กะเพรา') || name.includes('ต้มยำ') || name.includes('แกง') || name.includes('หมูกรอบ') || name.includes('ไก่')) {
      cat = 'thai';
    } else if (name.includes('สเต็ก') || name.includes('เนื้อ') || name.includes('steak') || name.includes('beef')) {
      cat = 'steak';
    }

    const newImage = getRandomImage(cat);
    await conn.query('UPDATE products SET image_url = ? WHERE product_id = ?', [newImage, p.product_id]);
    updatedCount++;
  }

  console.log('Updated ' + updatedCount + ' products with diverse images.');
  process.exit(0);
}

run();
