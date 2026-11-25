const fs = require('fs');

async function patchServer() {
  const filePath = 'C:\\smartdeal\\smart-deal-backend\\src\\server.js';
  let content = fs.readFileSync(filePath, 'utf8');

  // Search for the reject shop API
  // It might look like app.put('/api/admin/shops/:id/reject'
  
  // Let's just output the content to a file in our workspace so the agent can read it!
  fs.writeFileSync('C:\\smartdealrider\\scratch\\server_copy.js', content);
  console.log('Copied server.js to workspace');
}

patchServer();
