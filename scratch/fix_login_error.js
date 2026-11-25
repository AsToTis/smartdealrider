const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');

  const searchStr = `    // Mock generating a simple token
    const token = Buffer.from(\`\${user.user_id}-\${Date.now()}\`).toString('base64');

    res.json({
      success: true,
      token,
      rider: {`;
      
  const replaceStr = `    // Mock generating a simple token
    const token = Buffer.from(\`\${user.user_id}-\${Date.now()}\`).toString('base64');

    const [ratingResult] = await db.query("SELECT COALESCE((SELECT AVG(rider_rating) FROM reviews WHERE rider_id = ? AND rider_rating > 0), rating, 0) as avg_rating FROM riders WHERE rider_id = ?", [rider.rider_id, rider.rider_id]);
    const avg_rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;

    res.json({
      success: true,
      token,
      rider: {`;

  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully fixed login API ReferenceError');
  } else {
    console.log('searchStr not found! Printing lines around res.json:');
    const lines = content.split('\\n');
    const idx = lines.findIndex(l => l.includes('res.json({') && lines[Math.max(0, lines.indexOf(l)-2)].includes('Buffer.from'));
    if (idx !== -1) {
      console.log(lines.slice(Math.max(0, idx-5), idx+5).join('\\n'));
    }
  }
} catch (e) {
  console.error('Error patching server.js:', e.message);
}
