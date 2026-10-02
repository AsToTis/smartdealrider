const fs = require('fs');
const path = 'C:\\smartdealadmin\\src\\pages\\RiderApprovals.jsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(
  "selectedRider.driver_license_number || selectedRider.driverLicenseNumber || '-'",
  "selectedRider.license_number || selectedRider.driver_license_number || selectedRider.driverLicenseNumber || '-'"
);
fs.writeFileSync(path, c);
console.log('Patched frontend');
