const fs = require('fs');
const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const searchStr = `res.json({ success: true, balance, todayIncome, todayJobs, pendingIncome, history });`;
  
  if (content.includes(searchStr)) {
    const replacementStr = `
    const [ratingResult] = await db.query("SELECT AVG(rider_rating) as avg_rating FROM reviews WHERE rider_id = ? AND rider_rating > 0", [riderId]);
    const rating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating).toFixed(1) : 0;

    res.json({ success: true, balance, todayIncome, todayJobs, pendingIncome, history, rating });`;
    
    content = content.replace(searchStr, replacementStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched server.js with rating API');
  } else {
    console.log('Could not find search string in server.js');
  }
} catch (e) {
  console.error('Error patching server.js:', e.message);
}
