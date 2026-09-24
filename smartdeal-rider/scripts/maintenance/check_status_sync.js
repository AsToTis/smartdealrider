const fs = require('fs');

try {
  const content = fs.readFileSync('C:/smartdeal/server.js', 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('app.put(\'/api/rider/deliveries/:order_id/status') || 
        line.includes('app.post(\'/api/rider/deliveries/:order_id/complete') ||
        line.includes('delivering') || 
        line.includes('picked_up') || 
        line.includes('arriving_shop')) {
      console.log(`Line ${idx + 1}: ${line}`);
    }
  });
} catch (e) {
  console.log(e.message);
}
