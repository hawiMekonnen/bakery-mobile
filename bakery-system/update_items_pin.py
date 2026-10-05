import sys

# 1. Update ItemsSoldScreen.js
file_items = 'c:/Users/user/Desktop/bakery-mobile/src/screens/ItemsSoldScreen.js'
with open(file_items, 'r', encoding='utf-8') as f:
    items_content = f.read()

# Add ManagerPinModal import
if "import ManagerPinModal" not in items_content:
    items_content = items_content.replace(
        "import ScreenHeader from '../components/ScreenHeader';",
        "import ScreenHeader from '../components/ScreenHeader';\nimport ManagerPinModal from '../components/ManagerPinModal';"
    )

# Add pinModalVisible state
if "const [pinModalVisible" not in items_content:
    items_content = items_content.replace(
        "  const [batchPreparedInput, setBatchPreparedInput] = useState('30');",
        "  const [batchPreparedInput, setBatchPreparedInput] = useState('30');\n  const [pinModalVisible, setPinModalVisible] = useState(false);"
    )

# Replace handleResetDay with PIN-guarded reset
old_reset_day = """  const handleResetDay = () => {
    Alert.alert(
      'Start New Day / Reset Shift',
      "This will reset the \\"Sold\\" count to 0 for all bakery items for today's new shift. Your prepared counts will remain intact.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Daily Sold to 0',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'RESET_DAILY_ITEMS_SOLD', payload: { resetPrepared: false } });
            Alert.alert('New Shift Started!', 'Sold counts have been reset to 0.');
          },
        },
      ]
    );
  };"""

new_reset_day = """  const handleResetDay = () => {
    setPinModalVisible(true);
  };

  const handleAuthorizedReset = () => {
    dispatch({ type: 'RESET_DAILY_ITEMS_SOLD', payload: { resetPrepared: false } });
    Alert.alert('Shift Reset Authorized! ✓', 'Daily sold counts have been reset to 0.');
  };"""

if old_reset_day in items_content:
    items_content = items_content.replace(old_reset_day, new_reset_day)

# Add ManagerPinModal JSX before the closing </View>
if "<ManagerPinModal" not in items_content:
    items_content = items_content.replace(
        "    </View>\n  );\n}",
        """      {/* Manager PIN Security Guard */}
      <ManagerPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onSuccess={handleAuthorizedReset}
        actionTitle="Authorize Shift Reset"
        actionDescription="Enter 4-digit Manager PIN to reset today's shift counters to zero."
      />
    </View>
  );
}"""
    )

with open(file_items, 'w', encoding='utf-8') as f:
    f.write(items_content)

print('Updated ItemsSoldScreen with Manager PIN protection!')
