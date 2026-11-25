const { execSync } = require('child_process');

console.log('--- Committing and Pushing smartdeal ---');
try {
  execSync('git add smart-deal-backend/src/server.js smart-deal-app/src/app/order-tracking.tsx smart-deal-app/src/app/order-chat.tsx smart-deal-app/src/app/checkout.tsx', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git commit -m "feat: full multi-party chat with photo support and sequential proof of delivery"', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  console.log('✅ smartdeal pushed successfully');
} catch (e) {
  console.log('smartdeal error:', e.message);
}

console.log('\n--- Committing and Pushing smartdealrider ---');
try {
  execSync('git add smartdeal-rider/src/app/delivery/[id].tsx smartdeal-rider/src/app/chat/[id].tsx smartdeal-rider/src/app/chat.tsx smartdeal-rider/src/app/(tabs)/index.tsx', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git commit -m "feat: sequential pickup and dropoff proof verification and live chat with store and customer"', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  console.log('✅ smartdealrider pushed successfully');
} catch (e) {
  console.log('smartdealrider error:', e.message);
}
