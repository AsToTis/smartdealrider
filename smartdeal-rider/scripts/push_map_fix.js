const { execSync } = require('child_process');

try {
  execSync('git add smartdeal-rider/src/app/delivery/[id].tsx', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git commit -m "fix: MapView rendering, polyline route and markers in delivery screen"', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  console.log('✅ smartdealrider pushed successfully');
} catch(e) {
  console.log('Push error:', e.message);
}
