import os
import re

MOBILE_DIR = r'c:\Users\user\Desktop\bakery-mobile'

def update_profile_screen():
    profile_path = os.path.join(MOBILE_DIR, 'src', 'screens', 'ProfileScreen.js')
    with open(profile_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import for syncService
    if "import { getServerUrl, setServerUrl, getLastSyncInfo, pushSyncData, DEFAULT_SERVER_URL } from '../services/syncService';" not in content:
        import_stmt = "import { getServerUrl, setServerUrl, getLastSyncInfo, pushSyncData, DEFAULT_SERVER_URL } from '../services/syncService';\n"
        content = re.sub(r"(import ScreenHeader from '\.\./components/ScreenHeader';)", r"\1\n" + import_stmt, content)

    # 2. Add state for server sync
    state_to_add = '''  const [serverUrl, setServerUrlState] = useState(DEFAULT_SERVER_URL);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncInfo, setLastSyncInfo] = useState(null);

  React.useEffect(() => {
    getServerUrl().then(url => {
      setServerUrlState(url);
      setNewServerUrl(url);
    });
    getLastSyncInfo().then(info => setLastSyncInfo(info));
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    const result = await pushSyncData(state);
    setSyncing(false);
    if (result.success) {
      setLastSyncInfo(result);
      Alert.alert(
        'Cloud Sync Successful! 🚀',
        `Successfully synced ${state.orders.length} orders and ${state.products.length} menu items to your Admin Server.`
      );
    } else {
      Alert.alert(
        'Server Unreachable ⚠️',
        `${result.message}\\n\\nPlease verify your phone is connected to the same Wi-Fi/network and check your Server URL.`
      );
    }
  };

  const handleSaveServerUrl = async () => {
    if (!newServerUrl.trim()) {
      Alert.alert('Error', 'Server URL cannot be empty.');
      return;
    }
    const saved = await setServerUrl(newServerUrl.trim());
    setServerUrlState(saved);
    setEditMode(null);
    Alert.alert('Saved', `Server URL set to: ${saved}`);
  };
'''

    if "handleSyncNow" not in content:
        content = re.sub(
            r"(const \[showNewPass, setShowNewPass\] = useState\(false\);)",
            r"\1\n" + state_to_add,
            content
        )

    # 3. Add 'server' to openEdit
    if "mode === 'server'" not in content:
        content = re.sub(
            r"(const openEdit = \(mode\) => \{)",
            r"\1\n    if (mode === 'server') { setNewServerUrl(serverUrl); setEditMode('server'); return; }",
            content
        )

    # 4. Add the Cloud Server Sync section before System Status
    sync_section_jsx = '''        {/* Cloud Server Sync Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.sectionLabel}>CLOUD SERVER & REAL-TIME SYNC</Text>
            {syncing && <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>Syncing...</Text>}
          </View>

          {/* Server URL Row */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => openEdit('server')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="server-outline" size={18} color={COLORS.info} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Admin Server Address</Text>
              <Text style={styles.settingValue} numberOfLines={1}>{serverUrl}</Text>
            </View>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Sync Status Row */}
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: lastSyncInfo?.status === 'success' ? COLORS.successLight : COLORS.surfaceSubtle }]}>
              <Ionicons
                name={lastSyncInfo?.status === 'success' ? 'checkmark-circle' : 'cloud-offline-outline'}
                size={18}
                color={lastSyncInfo?.status === 'success' ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Last Cloud Sync</Text>
              <Text style={[styles.settingValue, { color: lastSyncInfo?.status === 'success' ? COLORS.success : COLORS.textMuted, fontSize: 12 }]}>
                {lastSyncInfo?.timestamp ? new Date(lastSyncInfo.timestamp).toLocaleTimeString() + ` (${orders.length} orders synced)` : 'Not synced yet'}
              </Text>
            </View>
          </View>

          {/* Sync Now Button */}
          <TouchableOpacity
            style={[styles.syncNowBtn, syncing && { opacity: 0.6 }]}
            onPress={handleSyncNow}
            disabled={syncing}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.syncNowBtnText}>
              {syncing ? 'Connecting & Syncing...' : 'Sync Data to Admin Server Now 🔄'}
            </Text>
          </TouchableOpacity>
        </View>
'''

    if "CLOUD SERVER & REAL-TIME SYNC" not in content:
        content = re.sub(
            r"(\{\/\* App Info \*\/[\s\r\n]*<View style=\{styles\.section\}>[\s\r\n]*<Text style=\{styles\.sectionLabel\}>SYSTEM STATUS<\/Text>)",
            sync_section_jsx + "\n        " + r"\1",
            content
        )

    # 5. Add Server URL edit modal
    server_modal_jsx = '''      {/* Edit Modal: Server URL */}
      {editMode === 'server' && (
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Configure Admin Server URL</Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
              Enter the IP address of your server running the Bakery Admin Website (e.g. http://192.168.1.100:5000):
            </Text>
            <TextInput
              style={styles.editInput}
              value={newServerUrl}
              onChangeText={setNewServerUrl}
              placeholder="http://192.168.1.xxx:5000"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveServerUrl}>
                <Text style={styles.editSaveText}>Save Server</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
'''

    if "Configure Admin Server URL" not in content:
        content = re.sub(
            r"(<TextInput[\s\S]*?value=\{currentPassword\}[\s\S]*?<\/View>\s*<\/View>\s*\}\))",
            r"\1\n" + server_modal_jsx,
            content
        )

    # 6. Add syncNowBtn style
    if "syncNowBtn:" not in content:
        styles_to_add = '''  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  syncNowBtnText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
'''
        content = re.sub(r"(signOutBtn: \{)", styles_to_add + r"\1", content)

    with open(profile_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated: {profile_path}')

def update_pos_screen():
    pos_path = os.path.join(MOBILE_DIR, 'src', 'screens', 'POSScreen.js')
    with open(pos_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import for pushSyncData
    if "import { pushSyncData } from '../services/syncService';" not in content:
        content = re.sub(
            r"(import ScreenHeader from '\.\./components/ScreenHeader';)",
            r"\1\nimport { pushSyncData } from '../services/syncService';",
            content
        )

    # 2. In handleCheckout, trigger auto-sync
    if "pushSyncData" not in content or "Auto-sync order" not in content:
        target = "dispatch({ type: 'ADD_ORDER', payload: newOrder });"
        replacement = target + "\n\n    // Auto-sync order to server in background\n    pushSyncData({ ...state, orders: [newOrder, ...(state.orders || [])] }).catch(() => {});"
        if target in content and "Auto-sync order" not in content:
            content = content.replace(target, replacement, 1)

    with open(pos_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated: {pos_path}')

if __name__ == '__main__':
    update_profile_screen()
    update_pos_screen()
    print('Mobile Sync UI integration completed!')
