import sys

file_path = 'c:/Users/user/Desktop/bakery-mobile/src/screens/ProfileScreen.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ManagerPinModal import
if "import ManagerPinModal" not in content:
    content = content.replace(
        "import ScreenHeader from '../components/ScreenHeader';",
        "import ScreenHeader from '../components/ScreenHeader';\nimport ManagerPinModal from '../components/ManagerPinModal';"
    )

# 2. Add states for security in ProfileScreen
old_states_start = "  const [btModalVisible, setBtModalVisible] = useState(false);\n  const [connectedBtPrinter, setConnectedBtPrinter] = useState(null);"
new_states_start = (
    "  const [btModalVisible, setBtModalVisible] = useState(false);\n"
    "  const [connectedBtPrinter, setConnectedBtPrinter] = useState(null);\n"
    "  const [pinModalVisible, setPinModalVisible] = useState(false);\n"
    "  const [changePinModalVisible, setChangePinModalVisible] = useState(false);\n"
    "  const [newPinInput, setNewPinInput] = useState('');\n"
    "  const [auditLogsModalVisible, setAuditLogsModalVisible] = useState(false);"
)

if old_states_start in content:
    content = content.replace(old_states_start, new_states_start)

# 3. Guard handleResetSales with PIN
old_handle_reset = """  const handleResetSales = () => {
    Alert.alert(
      'Clear Sales Records',
      'Are you sure you want to clear all order history and reset daily sales to zero? (Your products and inventory will remain safe)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Sales',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'RESET_ORDERS' });
            Alert.alert('Cleared', 'All sales records have been cleared to zero.');
          },
        },
      ]
    );
  };"""

new_handle_reset = """  const handleResetSales = () => {
    setPinModalVisible(true);
  };

  const handleAuthorizedSalesWipe = () => {
    dispatch({ type: 'RESET_ORDERS' });
    dispatch({
      type: 'ADD_SECURITY_LOG',
      payload: {
        event: 'SALES_WIPED',
        description: 'Sales and order records cleared with Manager PIN authorization.',
        timestamp: new Date().toISOString(),
        user: state.auth?.username || 'admin',
      },
    });
    Alert.alert('Sales Cleared ✓', 'All order records have been reset to zero.');
  };

  const handleSaveNewPin = () => {
    if (!newPinInput || newPinInput.length !== 4 || isNaN(Number(newPinInput))) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit numeric PIN.');
      return;
    }
    dispatch({ type: 'UPDATE_MANAGER_PIN', payload: newPinInput });
    Alert.alert('PIN Updated ✓', `Manager security PIN set to: ${newPinInput}`);
    setNewPinInput('');
    setChangePinModalVisible(false);
  };"""

if old_handle_reset in content:
    content = content.replace(old_handle_reset, new_handle_reset)

# 4. Insert Security section before System Status
target_section = "        {/* App Info */}\n        <View style={styles.section}>\n          <Text style={styles.sectionLabel}>SYSTEM STATUS</Text>"
security_section = """        {/* Security & Access Control Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECURITY & ACCESS CONTROL</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setChangePinModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="keypad" size={18} color="#D97706" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Manager Security PIN</Text>
              <Text style={styles.settingValue}>
                •••• • Tap to Change (Default: {state.security?.managerPin || '1234'})
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Receipt Anti-Tamper Hash</Text>
              <Text style={[styles.settingValue, { color: '#16A34A' }]}>
                Active • Verification hash on all 58mm slips
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => setAuditLogsModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="list" size={18} color="#2563EB" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Security Audit Logs</Text>
              <Text style={styles.settingValue}>
                {(state.securityLogs || []).length} recorded security events
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYSTEM STATUS</Text>"""

if target_section in content and "SECURITY & ACCESS CONTROL" not in content:
    content = content.replace(target_section, security_section)

# 5. Insert Change PIN modal and Audit Log modal at the bottom
modals_bottom = """      {/* Manager PIN Guard for Sales Reset */}
      <ManagerPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onSuccess={handleAuthorizedSalesWipe}
        actionTitle="Authorize Sales Wipe"
        actionDescription="Enter 4-digit Manager PIN to confirm resetting all sales history."
      />

      {/* Change Manager PIN Modal */}
      {changePinModalVisible && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalCard}>
              <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7', alignSelf: 'center', marginBottom: 12 }]}>
                <Ionicons name="keypad" size={24} color="#D97706" />
              </View>
              <Text style={styles.editModalTitle}>Change Manager PIN</Text>
              <Text style={styles.editModalSub}>
                Enter a new 4-digit security PIN for authorizing shift resets, price changes, and data wipes.
              </Text>
              <TextInput
                style={[styles.editModalInput, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                value={newPinInput}
                onChangeText={setNewPinInput}
                keyboardType="numeric"
                maxLength={4}
                autoFocus
                placeholder="••••"
              />
              <View style={styles.editModalBtnRow}>
                <TouchableOpacity
                  style={styles.editModalCancel}
                  onPress={() => {
                    setNewPinInput('');
                    setChangePinModalVisible(false);
                  }}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editModalSave}
                  onPress={handleSaveNewPin}
                >
                  <Text style={styles.editModalSaveText}>Save PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Security Audit Logs Modal */}
      {auditLogsModalVisible && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.editModalOverlay}>
            <View style={[styles.editModalCard, { maxHeight: '80%', width: '92%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={20} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={styles.editModalTitle}>Security Audit Log</Text>
                </View>
                <TouchableOpacity onPress={() => setAuditLogsModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {(state.securityLogs || []).map((log, idx) => (
                  <View key={log.id || idx} style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textPrimary }}>
                        {log.event}
                      </Text>
                      <Text style={{ fontSize: 9, color: COLORS.textMuted }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
                      {log.description}
                    </Text>
                    <Text style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>
                      User: {log.user || 'admin'} • {new Date(log.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}"""

if "</View>\n  );\n}" in content and "<ManagerPinModal" not in content:
    content = content.replace("</View>\n  );\n}", modals_bottom + "\n    </View>\n  );\n}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated ProfileScreen with Security & Access Control!')
