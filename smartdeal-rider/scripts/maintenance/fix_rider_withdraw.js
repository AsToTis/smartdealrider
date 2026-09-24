const fs = require('fs');

const serverPath = 'c:\\smartdeal\\server.js';
let code = fs.readFileSync(serverPath, 'utf8');

const targetStr = `const [withdraws] = await db.query("SELECT SUM(amount) as withdrawn FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? AND type = 'debit'", [rider_id]);
    
    const earned = delivs[0].earned || 0;`;

const newStr = `const [withdraws] = await db.query("SELECT SUM(amount) as withdrawn FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? AND type = 'debit'", [rider_id]);
    const [pendingW] = await db.query("SELECT SUM(amount) as p_amount FROM withdrawals WHERE user_type = 'rider' AND rider_id = ? AND status = 'pending'", [rider_id]);
    const pendingWithdrawn = pendingW[0]?.p_amount || 0;
    
    const earned = delivs[0].earned || 0;`;

code = code.replace(targetStr, newStr);

fs.writeFileSync(serverPath, code, 'utf8');
console.log('Fixed pendingWithdrawn bug');
