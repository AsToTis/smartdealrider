const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');
  const inject = `
      const [ratingResult] = await db.query("SELECT COALESCE((SELECT AVG(rider_rating) FROM reviews WHERE rider_id = ? AND rider_rating > 0), rating, 0) as avg_rating FROM riders WHERE rider_id = ?", [rider.rider_id, rider.rider_id]);
      const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;
      `;
  
  const target = `    const token = Buffer.from(\`\${user.user_id}-\${Date.now()}\`).toString('base64');`;
  
  const targetIdx = content.indexOf(target);
  if (targetIdx !== -1) {
    const insertIdx = targetIdx + target.length;
    content = content.slice(0, insertIdx) + "\\n" + inject + content.slice(insertIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully injected rating code at index ' + insertIdx);
  } else {
    console.log('Could not find target string: ' + target);
  }
} catch (e) {
  console.error(e.message);
}
