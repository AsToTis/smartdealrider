const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchStr = `        rider_status: rider.rider_status,`;
  
  if (content.includes(searchStr)) {
    // Add rating fetch before res.json
    const fetchRatingStr = `
    const [ratingResult] = await db.query("SELECT AVG(rider_rating) as avg_rating FROM reviews WHERE rider_id = ? AND rider_rating > 0", [rider.rider_id]);
    const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;
    
    res.json({
      success: true,
      token,
      rider: {`;
      
    content = content.replace(`    res.json({
      success: true,
      token,
      rider: {`, fetchRatingStr);
      
    content = content.replace(`        rider_status: rider.rider_status,`, `        rider_status: rider.rider_status,\n        rating: avg_rating,`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched server.js login API with rating');
  } else {
    console.log('Could not find search string in server.js');
  }
} catch (e) {
  console.error('Error patching server.js:', e.message);
}
