const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix wallet endpoint
  const searchWallet = `const [ratingResult] = await db.query("SELECT AVG(rider_rating) as avg_rating FROM reviews WHERE rider_id = ? AND rider_rating > 0", [riderId]);
    const rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;`;
    
  const replaceWallet = `const [ratingResult] = await db.query("SELECT COALESCE((SELECT AVG(rider_rating) FROM reviews WHERE rider_id = ? AND rider_rating > 0), rating, 0) as avg_rating FROM riders WHERE rider_id = ?", [riderId, riderId]);
    const rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;`;

  if (content.includes(searchWallet)) {
    content = content.replace(searchWallet, replaceWallet);
  }

  // Fix login endpoint
  const searchLogin = `const [ratingResult] = await db.query("SELECT AVG(rider_rating) as avg_rating FROM reviews WHERE rider_id = ? AND rider_rating > 0", [rider.rider_id]);
    const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;`;

  const replaceLogin = `const [ratingResult] = await db.query("SELECT COALESCE((SELECT AVG(rider_rating) FROM reviews WHERE rider_id = ? AND rider_rating > 0), rating, 0) as avg_rating FROM riders WHERE rider_id = ?", [rider.rider_id, rider.rider_id]);
    const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;`;

  if (content.includes(searchLogin)) {
    content = content.replace(searchLogin, replaceLogin);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched server.js with fallback rating from riders table');
} catch (e) {
  console.error('Error patching server.js:', e.message);
}
