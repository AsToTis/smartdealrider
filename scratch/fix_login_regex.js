const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');

  // We find 'const token = Buffer.from(...' and insert the rating code before 'res.json({'
  // We can just use replace with regex
  const regex = /(const token = Buffer\.from\([^)]+\)\.toString\('base64'\);[\s\S]*?)(res\.json\({[\s\S]*?success: true,[\s\S]*?token,[\s\S]*?rider: {)/;

  const match = content.match(regex);
  if (match) {
    const injectedCode = `
      const [ratingResult] = await db.query("SELECT COALESCE((SELECT AVG(rider_rating) FROM reviews WHERE rider_id = ? AND rider_rating > 0), rating, 0) as avg_rating FROM riders WHERE rider_id = ?", [rider.rider_id, rider.rider_id]);
      const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;
      `;
    
    content = content.replace(regex, match[1] + injectedCode + match[2]);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully fixed login API ReferenceError via Regex');
  } else {
    console.log('Regex did not match anything!');
  }
} catch (e) {
  console.error('Error patching server.js:', e.message);
}
