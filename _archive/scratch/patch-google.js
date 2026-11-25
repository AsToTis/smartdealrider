const fs = require('fs');

const path = "c:\\smartdeal\\smart-deal-app\\src\\app\\index.tsx";
let content = fs.readFileSync(path, 'utf8');

// 1. Add state variable
content = content.replace("const [forgotStep, setForgotStep] = useState<number>(1);", `const [forgotStep, setForgotStep] = useState<number>(1);
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');`);

// 2. Add handleGoogleMock function
const handleGoogle = `
  const handleGoogleMock = async () => {
    if (!googleEmail) return Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมล');
    try {
      const res = await axios.post(\`\${BASE_URL}/auth/google-mock\`, { email: googleEmail });
      if (res.data?.success) {
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        await AsyncStorage.setItem('userToken', res.data.token);
        setShowGoogleMock(false);
        router.replace('/(tabs)');
      }
    } catch (err) {
      Alert.alert('ข้อผิดพลาด', 'จำลองการเข้าสู่ระบบด้วย Google ล้มเหลว');
    }
  };
`;
content = content.replace("const handleResetPassword = async () => {", handleGoogle + "\n  const handleResetPassword = async () => {");

// 3. Modify Google Button
// We need to carefully replace the exact string. Let's just use regex for the TouchableOpacity containing the text.
const btnRegex = /<TouchableOpacity style=\{styles\.googleButton\}>[\s\S]*?<Text style=\{styles\.googleButtonText\}>G เข้าสู่ระบบด้วย Google<\/Text>[\s\S]*?<\/TouchableOpacity>/;
const newGoogleBtn = `
        <TouchableOpacity style={styles.googleButton} onPress={() => setShowGoogleMock(true)}>
          <Text style={styles.googleButtonText}>G เข้าสู่ระบบด้วย Google</Text>
        </TouchableOpacity>
`;
content = content.replace(btnRegex, newGoogleBtn);

// 4. Add Google Mock Modal
const googleModal = `
      <Modal visible={showGoogleMock} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Google Login (Mock)</Text>
            <Text style={styles.modalSubtitle}>กรอกอีเมลเพื่อจำลองการเข้าระบบ (ไม่มีบัญชีจะสมัครให้อัตโนมัติ)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="อีเมล (เช่น test@gmail.com)"
              value={googleEmail}
              onChangeText={setGoogleEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleGoogleMock}>
              <Text style={styles.modalButtonText}>ดำเนินการต่อ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseText} onPress={() => setShowGoogleMock(false)}>
              <Text style={styles.modalCloseTextContent}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
`;
content = content.replace("</SafeAreaView>", googleModal + "\n    </SafeAreaView>");

fs.writeFileSync(path, content, 'utf8');
console.log("Done");
