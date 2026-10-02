const fs = require('fs');
const path = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
let content = fs.readFileSync(path, 'utf8');

const target1 = `const { email, password, phone, name, vehicle_type, vehicle_plate, real_name } = req.body;`;
const replace1 = `const { email, password, phone, name, vehicle_type, vehicle_plate, real_name, license_number } = req.body;`;

const target2 = `'UPDATE riders SET name=?, phone=?, real_name=?, vehicle_type=?, vehicle_plate=?, id_card_image=?, license_image=?, vehicle_doc_image=?, status="pending" WHERE user_id=?',
            [name, phone, real_name, vehicle_type, vehicle_plate, 
             id_card_image || riderCheck[0].id_card_image, 
             license_image || riderCheck[0].license_image, 
             vehicle_doc_image || riderCheck[0].vehicle_doc_image, 
             user.user_id]`;
const replace2 = `'UPDATE riders SET name=?, phone=?, real_name=?, vehicle_type=?, vehicle_plate=?, license_number=?, id_card_image=?, license_image=?, vehicle_doc_image=?, status="pending" WHERE user_id=?',
            [name, phone, real_name, vehicle_type, vehicle_plate, license_number,
             id_card_image || riderCheck[0].id_card_image, 
             license_image || riderCheck[0].license_image, 
             vehicle_doc_image || riderCheck[0].vehicle_doc_image, 
             user.user_id]`;

const target3 = `'INSERT INTO riders (user_id, name, phone, real_name, vehicle_type, vehicle_plate, id_card_image, license_image, vehicle_doc_image, status, rider_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", "offline")',
      [userId, name, phone, real_name, vehicle_type, vehicle_plate, id_card_image, license_image, vehicle_doc_image]`;
const replace3 = `'INSERT INTO riders (user_id, name, phone, real_name, vehicle_type, vehicle_plate, license_number, id_card_image, license_image, vehicle_doc_image, status, rider_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", "offline")',
      [userId, name, phone, real_name, vehicle_type, vehicle_plate, license_number, id_card_image, license_image, vehicle_doc_image]`;

content = content.replace(target1, replace1);
content = content.replace(target2, replace2);
content = content.replace(target3, replace3);

fs.writeFileSync(path, content);
console.log('Successfully patched server.js for license_number!');
