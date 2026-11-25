const { execSync } = require('child_process');

console.log('--- Committing smartdeal ---');
try {
  execSync('git add smart-deal-backend/src/server.js smart-deal-app/src/app/checkout.tsx', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git commit -m "fix: apply dynamic delivery fare structure and rider commission"', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdeal', stdio: 'inherit' });
} catch (e) {
  console.log('smartdeal git result:', e.message);
}

console.log('\n--- Committing smartdealrider ---');
try {
  execSync('git add smartdeal-rider/src/app/(tabs)/index.tsx smartdeal-rider/src/app/delivery/[id].tsx smartdeal-rider/src/app/(tabs)/jobs.tsx smartdeal-rider/src/app/(tabs)/history.tsx', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git commit -m "fix: display delivery fee according to System Control Panel delivery fare structure"', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
} catch (e) {
  console.log('smartdealrider git result:', e.message);
}
