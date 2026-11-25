const fs = require('fs');
const path = "c:\\smartdeal\\smart-deal-app\\src\\app\\index.tsx";
let content = fs.readFileSync(path, 'utf8');

// Remove state variables
content = content.replace("  const [showGoogleMock, setShowGoogleMock] = useState(false);\n", "");
content = content.replace("  const [googleEmail, setGoogleEmail] = useState('');\n", "");

// Remove handleGoogleMock
const startIdx = content.indexOf("const handleGoogleMock");
if (startIdx !== -1) {
    const endIdx = content.indexOf("const handleResetPassword");
    content = content.substring(0, startIdx) + content.substring(endIdx);
}

// Remove Modal
const modalStart = content.indexOf("<Modal visible={showGoogleMock}");
if (modalStart !== -1) {
    const modalEnd = content.indexOf("</Modal>") + 8;
    content = content.substring(0, modalStart) + content.substring(modalEnd);
}

// Remove onPress from Google button
content = content.replace("<TouchableOpacity style={styles.googleButton} onPress={() => setShowGoogleMock(true)}>", "<TouchableOpacity style={styles.googleButton}>");

fs.writeFileSync(path, content, 'utf8');
console.log("Mock removed successfully");
