const fs = require('fs');

const serverPath = 'c:\\smartdeal\\server.js';
let code = fs.readFileSync(serverPath, 'utf8');

// Fix 1: Subtract pendingWithdrawn from balance in GET /api/rider/wallet
const balanceTarget = `const withdrawn = withdraws[0].withdrawn || 0;
        balance = Number(earned) - Number(withdrawn);`;
const balanceReplace = `const withdrawn = withdraws[0].withdrawn || 0;
        balance = Number(earned) - Number(withdrawn) - Number(pendingWithdrawn);`;
code = code.replace(balanceTarget, balanceReplace);

// Fix 2: Add pending withdrawals to the rider's history
const historyTarget = `const [walletTx] = await db.query("SELECT id, created_at, amount, type, description FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? ORDER BY created_at DESC LIMIT 15", [riderId]);
  
      let history = [...deliveries, ...walletTx];`;
const historyReplace = `const [walletTx] = await db.query("SELECT id, created_at, amount, type, description FROM wallet_transactions WHERE user_type = 'rider' AND target_id = ? ORDER BY created_at DESC LIMIT 15", [riderId]);
      
      const [pendingWithdrawalsList] = await db.query("SELECT id, created_at, amount, 'debit' as type, 'ถอนเงิน (รออนุมัติ)' as description FROM withdrawals WHERE user_type = 'rider' AND rider_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 15", [riderId]);
  
      let history = [...deliveries, ...walletTx, ...pendingWithdrawalsList];`;
code = code.replace(historyTarget, historyReplace);

fs.writeFileSync(serverPath, code, 'utf8');
console.log('Fixed wallet balance and history');
