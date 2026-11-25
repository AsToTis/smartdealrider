const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== Patching Buyer Checkout to dynamically sync with Admin Settings ===');
const checkoutPath = 'C:/smartdeal/smart-deal-app/src/app/checkout.tsx';
let content = fs.readFileSync(checkoutPath, 'utf8');

if (!content.includes('systemFare')) {
  content = content.replace(
    'const [loadingCoupons, setLoadingCoupons] = useState(false);',
    'const [loadingCoupons, setLoadingCoupons] = useState(false);\n  const [systemFare, setSystemFare] = useState({ baseFee: 35, perKmFee: 8 });'
  );

  content = content.replace(
    'await loadUserCoupons(userId);',
    'await loadUserCoupons(userId);\n      await fetchSystemFareSettings();'
  );

  const fetchFn = `  const fetchSystemFareSettings = async () => {
    try {
      const res = await axios.get(\`\${BASE_URL}/admin/settings\`);
      if (res.data?.success && Array.isArray(res.data.settings)) {
        const b = res.data.settings.find((s: any) => s.setting_key === 'base_delivery_fee');
        const p = res.data.settings.find((s: any) => s.setting_key === 'per_km_fee');
        setSystemFare({
          baseFee: parseFloat(b?.setting_value) || 35,
          perKmFee: parseFloat(p?.setting_value) || 8,
        });
      }
    } catch (e) {}
  };
`;

  content = content.replace('  const loadUserCoupons = async (userId: number) => {', fetchFn + '\n  const loadUserCoupons = async (userId: number) => {');

  content = content.replace(
    /const baseDeliveryFare = 35;\s*const perKmFare = 8;\s*const estimatedDistanceKm = 2\.5;\s*const calculatedDeliveryFare = Math\.round\(baseDeliveryFare \+ \(estimatedDistanceKm \* perKmFare\)\);/,
    'const estimatedDistanceKm = 2.5;\n  const calculatedDeliveryFare = Math.round(systemFare.baseFee + (estimatedDistanceKm * systemFare.perKmFee));'
  );

  fs.writeFileSync(checkoutPath, content, 'utf8');
  console.log('✅ Added dynamic system settings fetching to checkout.tsx');
}

console.log('=== Patching Rider Home to dynamically sync with Admin Settings ===');
const riderHomePath = 'c:/smartdealrider/smartdeal-rider/src/app/(tabs)/index.tsx';
let riderHomeContent = fs.readFileSync(riderHomePath, 'utf8');

if (!riderHomeContent.includes('fetchSystemFareConfig')) {
  const fareState = `  const [adminFare, setAdminFare] = useState({ baseFare: 35, perKm: 8, riderPercent: 100 });

  const fetchAdminFare = async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data?.success && Array.isArray(res.data.settings)) {
        const b = res.data.settings.find((s: any) => s.setting_key === 'base_delivery_fee');
        const p = res.data.settings.find((s: any) => s.setting_key === 'per_km_fee');
        const r = res.data.settings.find((s: any) => s.setting_key === 'rider_commission_percent');
        setAdminFare({
          baseFare: parseFloat(b?.setting_value) || 35,
          perKm: parseFloat(p?.setting_value) || 8,
          riderPercent: parseFloat(r?.setting_value) || 100,
        });
      }
    } catch (e) {}
  };
`;
  
  riderHomeContent = riderHomeContent.replace('  const [acceptingId, setAcceptingId] = useState<number | null>(null);', '  const [acceptingId, setAcceptingId] = useState<number | null>(null);\n' + fareState);

  riderHomeContent = riderHomeContent.replace(
    'const baseFare = 35;\n        const perKm = 8;',
    'const baseFare = adminFare.baseFare;\n        const perKm = adminFare.perKm;'
  );

  riderHomeContent = riderHomeContent.replace(
    'fetchWallet();\n      checkActiveDelivery();',
    'fetchWallet();\n      checkActiveDelivery();\n      fetchAdminFare();'
  );

  fs.writeFileSync(riderHomePath, riderHomeContent, 'utf8');
  console.log('✅ Added dynamic admin fare fetching to rider index.tsx');
}

console.log('=== Committing and pushing updates ===');
try {
  execSync('git add smart-deal-app/src/app/checkout.tsx', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git commit -m "feat: real-time dynamic admin settings sync in checkout"', { cwd: 'c:/smartdeal', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdeal', stdio: 'inherit' });
} catch (e) {
  console.log('smartdeal git result:', e.message);
}

try {
  execSync('git add smartdeal-rider/src/app/(tabs)/index.tsx', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git commit -m "feat: real-time dynamic admin settings sync in rider home"', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
  execSync('git push', { cwd: 'c:/smartdealrider', stdio: 'inherit' });
} catch (e) {
  console.log('smartdealrider git result:', e.message);
}
