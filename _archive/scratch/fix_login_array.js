const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\\n');
  
  const tokenIdx = lines.findIndex(l => l.includes('Mock generating a simple token'));
  if (tokenIdx !== -1) {
    // Check if the query is already there
    if (!lines[tokenIdx + 2].includes('avg_rating') && !lines[tokenIdx + 3].includes('avg_rating')) {
      const injectedCode = [
        '      const [ratingResult] = await db.query("SELECT COALESCE((SELECT AVG(rider_rating) FROM reviews WHERE rider_id = ? AND rider_rating > 0), rating, 0) as avg_rating FROM riders WHERE rider_id = ?", [rider.rider_id, rider.rider_id]);',
        '      const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;'
      ];
      
      lines.splice(tokenIdx + 2, 0, ...injectedCode);
      fs.writeFileSync(filePath, lines.join('\\n'), 'utf8');
      console.log('Successfully injected rating code at line ' + (tokenIdx + 2));
    } else {
      console.log('Code already exists?');
    }
  } else {
    console.log('Could not find Mock generating a simple token');
  }
} catch (e) {
  console.error(e.message);
}
