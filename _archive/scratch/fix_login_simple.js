const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');
  const searchPart = "res.json({\\n      success: true,\\n      token,\\n      rider: {";
  const searchPart2 = "res.json({\\r\\n      success: true,\\r\\n      token,\\r\\n      rider: {";
  const searchPart3 = "res.json({\\n        success: true,\\n        token,\\n        rider: {";
  const searchPart4 = "res.json({\\r\\n        success: true,\\r\\n        token,\\r\\n        rider: {";
  
  const inject = `const [ratingResult] = await db.query("SELECT COALESCE((SELECT AVG(rider_rating) FROM reviews WHERE rider_id = ? AND rider_rating > 0), rating, 0) as avg_rating FROM riders WHERE rider_id = ?", [rider.rider_id, rider.rider_id]);\\n      const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;\\n\\n      `;
  
  if (content.includes(searchPart4)) {
    content = content.replace(searchPart4, inject + searchPart4);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed with 4!');
  } else if (content.includes(searchPart3)) {
    content = content.replace(searchPart3, inject + searchPart3);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed with 3!');
  } else if (content.includes(searchPart2)) {
    content = content.replace(searchPart2, inject + searchPart2);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed with 2!');
  } else if (content.includes(searchPart)) {
    content = content.replace(searchPart, inject + searchPart);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed with 1!');
  } else {
    console.log('Could not find res.json block!');
  }
} catch (e) {
  console.error(e.message);
}
