const fs = require('fs');
const path = require('path');

const serverFile = 'c:\\smartdeal\\server.js';
let content = fs.readFileSync(serverFile, 'utf8');

if (!content.includes('/api/rider/wallet/withdraw')) {
  const endpoint = `

// Rider Withdraw API
app.post('/api/rider/wallet/withdraw', async (req, res) => {
  const { rider_id, amount } = req.body;
  if (!rider_id || !amount) return res.status(400).json({ success: false, message: 'Missing fields' });
  
  try {
    const [delivs] = await db.query("SELECT SUM(o.delivery_fee) as earned FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.rider_id = ? AND d.status = 'delivered'", [rider_id]);
    const [withdraws] = await db.query("SELECT SUM(amount) as withdrawn FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? AND type = 'debit'", [rider_id]);
    
    const earned = delivs[0].earned || 0;
    const withdrawn = withdraws[0].withdrawn || 0;
    const balance = Number(earned) - Number(withdrawn);
    
    if (balance < amount) {
      return res.status(400).json({ success: false, message: 'ยอดเงินไม่เพียงพอ' });
    }

    await db.query("INSERT INTO wallet_transactions (user_type, target_id, amount, type, description) VALUES ('rider', ?, ?, 'debit', 'ถอนเงิน')", [rider_id, amount]);
    
    res.json({ success: true, message: 'ถอนเงินสำเร็จ' });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
`;

  content += endpoint;
  fs.writeFileSync(serverFile, content, 'utf8');
  console.log('Endpoint added successfully');
} else {
  console.log('Endpoint already exists');
}
