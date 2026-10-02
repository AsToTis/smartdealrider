const fs = require('fs');
const path = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
let content = fs.readFileSync(path, 'utf8');

// The first target worked (req.body parsing)

// Fix UPDATE query
content = content.replace(
  /'UPDATE riders SET name=\?, phone=\?, real_name=\?, vehicle_type=\?, vehicle_plate=\?, id_card_image=\?, license_image=\?, vehicle_doc_image=\?, status="pending" WHERE user_id=\?'/,
  '\'UPDATE riders SET name=?, phone=?, real_name=?, vehicle_type=?, vehicle_plate=?, license_number=?, id_card_image=?, license_image=?, vehicle_doc_image=?, status="pending" WHERE user_id=?\''
);

// Fix UPDATE parameters
content = content.replace(
  /\[name, phone, real_name, vehicle_type, vehicle_plate,(\s*)id_card_image/g,
  '[name, phone, real_name, vehicle_type, vehicle_plate, license_number,$1id_card_image'
);

// Fix INSERT query
content = content.replace(
  /'INSERT INTO riders \(user_id, name, phone, real_name, vehicle_type, vehicle_plate, id_card_image, license_image, vehicle_doc_image, status, rider_status\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, "pending", "offline"\)'/,
  '\'INSERT INTO riders (user_id, name, phone, real_name, vehicle_type, vehicle_plate, license_number, id_card_image, license_image, vehicle_doc_image, status, rider_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", "offline")\''
);

// Fix INSERT parameters
content = content.replace(
  /\[userId, name, phone, real_name, vehicle_type, vehicle_plate, id_card_image, license_image, vehicle_doc_image\]/,
  '[userId, name, phone, real_name, vehicle_type, vehicle_plate, license_number, id_card_image, license_image, vehicle_doc_image]'
);

fs.writeFileSync(path, content);
console.log('Successfully applied patch 2');
