const fs = require('fs');
const db = require('C:\\smartdeal\\db.js');

async function run() {
  // 1. Database Migration
  try {
    console.log('Altering withdrawals table...');
    // Make shop_id nullable, add user_type and rider_id
    await db.query(`ALTER TABLE withdrawals MODIFY shop_id INT NULL`);
    
    // Check if user_type exists
    const [cols] = await db.query(`SHOW COLUMNS FROM withdrawals LIKE 'user_type'`);
    if (cols.length === 0) {
      await db.query(`ALTER TABLE withdrawals ADD COLUMN user_type ENUM('shop', 'rider') DEFAULT 'shop' AFTER id`);
      await db.query(`ALTER TABLE withdrawals ADD COLUMN rider_id INT NULL AFTER shop_id`);
      console.log('Columns added successfully.');
    } else {
      console.log('Columns already exist.');
    }
  } catch(e) {
    console.error('DB error:', e);
  }

  // 2. Patch server.js
  const serverPath = 'c:\\smartdeal\\server.js';
  let code = fs.readFileSync(serverPath, 'utf8');

  // Patch POST /api/rider/wallet/withdraw
  const oldRiderWithdrawRegex = /await db\.query\("INSERT INTO wallet_transactions \(user_type, target_id, amount, type, description\) VALUES \('rider', \?, \?, 'debit', 'ถอนเงิน'\)", \[rider_id, amount\]\);/g;
  const newRiderWithdraw = `await db.query("INSERT INTO withdrawals (user_type, rider_id, amount, status) VALUES ('rider', ?, ?, 'pending')", [rider_id, amount]);`;
  if (code.match(oldRiderWithdrawRegex)) {
    code = code.replace(oldRiderWithdrawRegex, newRiderWithdraw);
    console.log('Patched POST /api/rider/wallet/withdraw');
  }

  // Patch GET /api/rider/wallet (balance calculation)
  const oldRiderBalanceRegex = /const \[withdraws\] = await db\.query\("SELECT SUM\(amount\) as withdrawn FROM wallet_transactions WHERE user_type = 'rider' AND target_id = \? AND type = 'debit'", \[riderId\]\);/g;
  const newRiderBalance = `const [withdraws] = await db.query("SELECT SUM(amount) as withdrawn FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? AND type = 'debit'", [riderId]);
      const [pendingW] = await db.query("SELECT SUM(amount) as p_amount FROM withdrawals WHERE user_type = 'rider' AND rider_id = ? AND status = 'pending'", [riderId]);
      const pendingWithdrawn = pendingW[0]?.p_amount || 0;`;
  
  const oldBalanceMathRegex = /const withdrawn = withdraws\[0\]\.withdrawn \|\| 0;\s*const balance = Number\(earned\) - Number\(withdrawn\);/g;
  const newBalanceMath = `const withdrawn = withdraws[0].withdrawn || 0;
    const balance = Number(earned) - Number(withdrawn) - Number(pendingWithdrawn);`;

  if (code.match(oldRiderBalanceRegex) && !code.includes('pendingWithdrawn')) {
      code = code.replace(oldRiderBalanceRegex, newRiderBalance);
      code = code.replace(oldBalanceMathRegex, newBalanceMath);
      console.log('Patched GET /api/rider/wallet (balance)');
  }

  // Patch admin withdrawals fetch
  const adminQueryRegex = /SELECT w\.id, w\.amount.*FROM withdrawals w\s+JOIN shops s ON w\.shop_id = s\.shop_id\s+WHERE w\.status = "pending"\s+ORDER BY w\.created_at DESC/s;
  const newAdminQuery = `SELECT w.id, w.amount, w.status, w.created_at, w.user_type, 
          COALESCE(s.name, u.full_name) as shop_name, 
          COALESCE(s.bank_name, r.bank_name) as bank_name, 
          COALESCE(s.bank_account, r.bank_account) as bank_account, 
          s.bookbank_image
        FROM withdrawals w
        LEFT JOIN shops s ON w.shop_id = s.shop_id
        LEFT JOIN riders r ON w.rider_id = r.rider_id
        LEFT JOIN users u ON r.user_id = u.user_id
        WHERE w.status = "pending"
        ORDER BY w.created_at DESC`;
  
  if (code.match(adminQueryRegex)) {
    code = code.replace(adminQueryRegex, newAdminQuery);
    console.log('Patched GET /api/admin/withdrawals');
  }

  // Patch admin approve endpoint
  const adminApproveRegex = /const \[result\] = await db\.execute\('UPDATE withdrawals SET status = "completed", processed_at = CURRENT_TIMESTAMP WHERE id = \? AND status = "pending"', \[id\]\);/g;
  const newAdminApproveQuery = `
      const [wCheck] = await db.execute('SELECT * FROM withdrawals WHERE id = ? AND status = "pending"', [id]);
      if (wCheck.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบคำขอถอนเงินที่รออนุมัติ' });
      
      const wData = wCheck[0];
      const [result] = await db.execute('UPDATE withdrawals SET status = "completed", processed_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      
      if (wData.user_type === 'rider') {
        await db.execute("INSERT INTO wallet_transactions (user_type, target_id, amount, type, description) VALUES ('rider', ?, ?, 'debit', 'ถอนเงิน')", [wData.rider_id, wData.amount]);
      }
  `;

  if (code.match(adminApproveRegex)) {
    code = code.replace(adminApproveRegex, newAdminApproveQuery);
    console.log('Patched POST /api/admin/withdrawals/:id/approve');
  }

  fs.writeFileSync(serverPath, code, 'utf8');
  console.log('server.js patched successfully');
}

run();
