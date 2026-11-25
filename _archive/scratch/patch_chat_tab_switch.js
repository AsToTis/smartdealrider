const fs = require('fs');

const chatPath = 'C:/smartdealrider/smartdeal-rider/src/app/chat/[id].tsx';
let code = fs.readFileSync(chatPath, 'utf8');

code = code.replace(
  `onPress={() => setActiveChannel('seller')}`,
  `onPress={() => { setActiveChannel('seller'); setMessages([]); }}`
);

code = code.replace(
  `onPress={() => setActiveChannel('buyer')}`,
  `onPress={() => { setActiveChannel('buyer'); setMessages([]); }}`
);

fs.writeFileSync(chatPath, code, 'utf8');
console.log('✅ Updated chat/[id].tsx tab switch behavior');
