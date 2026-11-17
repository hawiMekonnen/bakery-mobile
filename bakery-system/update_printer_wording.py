import sys

# 1. Update BluetoothPrinterModal.js
bt_modal_file = 'c:/Users/user/Desktop/bakery-mobile/src/components/BluetoothPrinterModal.js'
with open(bt_modal_file, 'r', encoding='utf-8') as f:
    bt_content = f.read()

# Change header title from "Thermal Receipt Printer" to "Printer"
old_header_title = """              <View>
                <Text style={styles.title}>Thermal Receipt Printer</Text>
                <Text style={styles.subtitle}>
                  {connectedPrinter ? `Connected • ${paperWidth} Thermal Roll` : '58mm Thermal Roll Printing'}
                </Text>
              </View>"""

new_header_title = """              <View>
                <Text style={styles.title}>Printer</Text>
                <Text style={styles.subtitle}>
                  {connectedPrinter ? 'Connected & Ready' : 'Connect & Print'}
                </Text>
              </View>"""

if old_header_title in bt_content:
    bt_content = bt_content.replace(old_header_title, new_header_title)

# Remove the yellow note box completely
old_yellow_box = """            ) : (
              /* No Printer Connected Prompt */
              <View style={styles.unconnectedPrompt}>
                <Ionicons name="receipt-outline" size={36} color={COLORS.primary} />
                <Text style={styles.promptTitle}>Connect 58mm Thermal Printer</Text>
                <Text style={styles.promptDesc}>
                  The app prints physical receipts on continuous 58mm roll paper. Please pair your Bluetooth printer above, then add it to print.
                </Text>
              </View>
            )}"""

new_yellow_box = """            ) : null}"""

if old_yellow_box in bt_content:
    bt_content = bt_content.replace(old_yellow_box, new_yellow_box)

# Update section titles & button texts
bt_content = bt_content.replace(
    "{connectedPrinter ? 'SAVED THERMAL PRINTERS' : 'PAIRED RECEIPT PRINTERS'}",
    "{connectedPrinter ? 'SAVED PRINTERS' : 'PAIRED PRINTERS'}"
)

bt_content = bt_content.replace(
    "<Text style={styles.emptyPrintersTitle}>No Thermal Printers Added Yet</Text>",
    "<Text style={styles.emptyPrintersTitle}>No Printers Added Yet</Text>"
)

bt_content = bt_content.replace(
    'Tap "+ Add Paired Thermal Printer" below and enter your printer\'s name (e.g. POS-58, MPT-II).',
    'Tap "+ Add Paired Printer" below and enter your printer\'s name.'
)

bt_content = bt_content.replace(
    "<Text style={styles.addCustomToggleText}>Add Paired Thermal Printer</Text>",
    "<Text style={styles.addCustomToggleText}>Add Paired Printer</Text>"
)

bt_content = bt_content.replace(
    "<Text style={styles.customAddTitle}>Add Paired Thermal Printer</Text>",
    "<Text style={styles.customAddTitle}>Add Paired Printer</Text>"
)

bt_content = bt_content.replace(
    "Enter the name of the printer paired in your Bluetooth settings (e.g. POS-58, MPT-II, Bluetooth Printer).",
    "Enter the name of the printer paired in your Bluetooth settings."
)

bt_content = bt_content.replace(
    "Status: Paired & Ready for 58mm roll slips",
    "Status: Paired & Ready"
)

bt_content = bt_content.replace(
    "Print 58mm Receipt #{orderToPrint.id}",
    "Print Receipt #{orderToPrint.id}"
)

bt_content = bt_content.replace(
    "<Text style={styles.testPrintBtnText}>Print Test 58mm Slip</Text>",
    "<Text style={styles.testPrintBtnText}>Print Test Slip</Text>"
)

bt_content = bt_content.replace(
    "Direct Thermal Print (System Spooler)",
    "Direct Print (System Spooler)"
)

bt_content = bt_content.replace(
    "Sends 58mm roll format directly to your phone's print service",
    "Print directly using your phone's print service"
)

bt_content = bt_content.replace(
    "`Test 58mm slip sent to ${result.printerName}.`",
    "`Test slip sent to ${result.printerName}.`"
)

bt_content = bt_content.replace(
    "`Receipt #${orderToPrint.id} printed on ${result.paperWidth || '58mm'} thermal roll paper.`",
    "`Receipt #${orderToPrint.id} printed successfully (${result.printerName}).`"
)

with open(bt_modal_file, 'w', encoding='utf-8') as f:
    f.write(bt_content)

print('Updated BluetoothPrinterModal.js')

# 2. Update POSScreen.js
pos_file = 'c:/Users/user/Desktop/bakery-mobile/src/screens/POSScreen.js'
with open(pos_file, 'r', encoding='utf-8') as f:
    pos_content = f.read()

pos_content = pos_content.replace(
    "'Your 58mm thermal receipt printer is not connected. Please connect via Bluetooth to print the receipt roll slip.'",
    "'Your printer is not connected. Please connect via Bluetooth to print the receipt.'"
)
pos_content = pos_content.replace(
    "`Receipt #${lastCompletedOrder.id} successfully printed on ${result.paperWidth || '58mm'} thermal roll (${result.printerName}).`",
    "`Receipt #${lastCompletedOrder.id} successfully printed (${result.printerName}).`"
)
pos_content = pos_content.replace(
    "{isPrinting ? 'Printing...' : 'Print 58mm Slip'}",
    "{isPrinting ? 'Printing...' : 'Print Receipt'}"
)

with open(pos_file, 'w', encoding='utf-8') as f:
    f.write(pos_content)

print('Updated POSScreen.js')

# 3. Update OrdersScreen.js
orders_file = 'c:/Users/user/Desktop/bakery-mobile/src/screens/OrdersScreen.js'
with open(orders_file, 'r', encoding='utf-8') as f:
    orders_content = f.read()

orders_content = orders_content.replace(
    "'Your 58mm thermal receipt printer is not connected. Please connect via Bluetooth to print the receipt roll slip.'",
    "'Your printer is not connected. Please connect via Bluetooth to print the receipt.'"
)
orders_content = orders_content.replace(
    "`Receipt #${selectedOrder.id} successfully printed on ${result.paperWidth || '58mm'} thermal roll (${result.printerName}).`",
    "`Receipt #${selectedOrder.id} successfully printed (${result.printerName}).`"
)
orders_content = orders_content.replace(
    "{isPrinting ? 'Printing...' : 'Print 58mm Slip'}",
    "{isPrinting ? 'Printing...' : 'Print Receipt'}"
)

with open(orders_file, 'w', encoding='utf-8') as f:
    f.write(orders_content)

print('Updated OrdersScreen.js')

# 4. Update ProfileScreen.js
profile_file = 'c:/Users/user/Desktop/bakery-mobile/src/screens/ProfileScreen.js'
with open(profile_file, 'r', encoding='utf-8') as f:
    profile_content = f.read()

profile_content = profile_content.replace(
    "<Text style={styles.settingTitle}>Thermal Receipt Printer</Text>",
    "<Text style={styles.settingTitle}>Printer</Text>"
)
profile_content = profile_content.replace(
    "{connectedBtPrinter ? `Connected: ${connectedBtPrinter.name} (58mm Roll)` : 'Not Connected • Tap to Pair Printer'}",
    "{connectedBtPrinter ? `Connected: ${connectedBtPrinter.name}` : 'Not Connected • Tap to Pair'}"
)
profile_content = profile_content.replace(
    "Active • Verification hash on all 58mm slips",
    "Active • Verification hash on all receipts"
)

with open(profile_file, 'w', encoding='utf-8') as f:
    f.write(profile_content)

print('Updated ProfileScreen.js')
