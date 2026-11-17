import os, re

def clean_file(path, replacements):
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()
    orig = c
    for old, new in replacements:
        c = c.replace(old, new)
    if c != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(c)
        print(f"Updated {os.path.basename(path)}")
    else:
        print(f"No changes in {os.path.basename(path)}")

# 1. receiptPrinter.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\utils\receiptPrinter.js",
    [
        ("Please come again soon 🥐<br>", "Please come again soon<br>"),
        ("Thank you for your visit! 🥐", "Thank you for your visit!"),
    ]
)

# 2. BluetoothPrinterModal.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\components\BluetoothPrinterModal.js",
    [
        ("'Connected! 🖨️'", "'Connected'"),
        ("'Connection Failed ⚠️'", "'Connection Failed'"),
        ("'Test Printed! 🖨️'", "'Test Printed'"),
        ("'Receipt Printed! 🖨️'", "'Receipt Printed'"),
    ]
)

# 3. CloudSyncModal.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\components\CloudSyncModal.js",
    [
        ("'License Verified! ✓'", "'License Verified'"),
        ("'Cloud Sync Successful! 🚀'", "'Cloud Sync Successful'"),
        ("'Disaster Recovery Complete! ✓'", "'Disaster Recovery Complete'"),
    ]
)

# 4. WifiSyncModal.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\components\WifiSyncModal.js",
    [
        ("'Wi-Fi Sync Successful! 🚀'", "'Wi-Fi Sync Successful'"),
    ]
)

# 5. InventoryScreen.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\screens\InventoryScreen.js",
    [
        ('emoji="📦"', 'icon="cube-outline"'),
    ]
)

# 6. ItemsSoldScreen.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\screens\ItemsSoldScreen.js",
    [
        ("'Shift Reset Authorized! ✓'", "'Shift Reset Authorized'"),
        ('emoji="🥐"', 'icon="stats-chart-outline"'),
        ("<Text style={styles.emojiText}>{item.emoji || '🥐'}</Text>",
         "<Ionicons name=\"fast-food-outline\" size={20} color={COLORS.primary} style={{ marginRight: 6 }} />"),
    ]
)

# 7. AnalyticsScreen.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\screens\AnalyticsScreen.js",
    [
        ('emoji="💳"', 'icon="bar-chart-outline"'),
        ('<Text style={{ fontSize: 20, marginRight: 8 }}>💵</Text>',
         '<Ionicons name="cash-outline" size={20} color={COLORS.cashColor} style={{ marginRight: 8 }} />'),
        ('<Text style={{ fontSize: 20, marginRight: 8 }}>💳</Text>',
         '<Ionicons name="card-outline" size={20} color={COLORS.cardColor} style={{ marginRight: 8 }} />'),
        ('<Text style={{ fontSize: 20, marginRight: 8 }}>📱</Text>',
         '<Ionicons name="phone-portrait-outline" size={20} color={COLORS.mobileColor} style={{ marginRight: 8 }} />'),
    ]
)

# 8. DashboardScreen.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\screens\DashboardScreen.js",
    [
        ('<Text style={styles.sectionEmoji}>💵</Text>',
         '<Ionicons name="wallet-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />'),
        ('<Text style={styles.incomeMethodEmoji}>💵</Text>',
         '<Ionicons name="cash-outline" size={18} color={COLORS.cashColor} style={{ marginBottom: 4 }} />'),
        ('<Text style={styles.incomeMethodEmoji}>💳</Text>',
         '<Ionicons name="card-outline" size={18} color={COLORS.cardColor} style={{ marginBottom: 4 }} />'),
        ('<Text style={styles.incomeMethodEmoji}>📱</Text>',
         '<Ionicons name="phone-portrait-outline" size={18} color={COLORS.mobileColor} style={{ marginBottom: 4 }} />'),
        ('<Text style={styles.sectionEmoji}>🧾</Text>',
         '<Ionicons name="receipt-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />'),
        ('<Text style={{ fontSize: 28, marginBottom: 6 }}>🛍️</Text>',
         '<Ionicons name="bag-handle-outline" size={36} color={COLORS.textMuted} style={{ marginBottom: 6 }} />'),
        ('<Text style={{ fontSize: 32 }}>{p.emoji || \'🥐\'}</Text>',
         '<Ionicons name="fast-food-outline" size={26} color={COLORS.primary} />'),
    ]
)

# 9. OrdersScreen.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\screens\OrdersScreen.js",
    [
        ("'Receipt Printed! 🧾🖨️'", "'Receipt Printed'"),
        ('emoji="🧾"', 'icon="receipt-outline"'),
        ('<Text style={{ fontSize: 44 }}>🧾</Text>',
         '<Ionicons name="receipt-outline" size={44} color={COLORS.textMuted} />'),
        ("<Text style={{ fontSize: 16, marginRight: 6 }}>{it.emoji || '🥐'}</Text>",
         "<Ionicons name=\"fast-food-outline\" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />"),
    ]
)

# 10. POSScreen.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\screens\POSScreen.js",
    [
        ("'Receipt Printed! 🧾🖨️'", "'Receipt Printed'"),
        ('emoji="🛒"', 'icon="cart-outline"'),
        ("{ id: 'Cash', label: 'Cash', icon: 'cash-outline', emoji: '💵' }",
         "{ id: 'Cash', label: 'Cash', icon: 'cash-outline' }"),
        ("{ id: 'Card', label: 'Card', icon: 'card-outline', emoji: '💳' }",
         "{ id: 'Card', label: 'Card', icon: 'card-outline' }"),
        ("{ id: 'Mobile', label: 'Mobile', icon: 'phone-portrait-outline', emoji: '📱' }",
         "{ id: 'Mobile', label: 'Mobile', icon: 'phone-portrait-outline' }"),
        ("<Text style={{ fontSize: 16, marginRight: 4 }}>{m.emoji}</Text>",
         "<Ionicons name={m.icon} size={15} color={paymentMethod === m.id ? '#FFF' : COLORS.textPrimary} style={{ marginRight: 6 }} />"),
        ("<Text style={{ fontSize: 44, marginBottom: 8 }}>🛒</Text>",
         "<Ionicons name=\"cart-outline\" size={44} color={COLORS.textMuted} style={{ marginBottom: 8 }} />"),
        ("<Text style={{ fontSize: 24, marginRight: 10 }}>{item.emoji || '🥐'}</Text>",
         "<View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><Ionicons name=\"fast-food-outline\" size={16} color={COLORS.primary} /></View>"),
        ("Payment Completed!", "Payment Completed"),
    ]
)

# 11. ProductsScreen.js
clean_file(
    r"C:\Users\user\Desktop\bakery-mobile\src\screens\ProductsScreen.js",
    [
        ('emoji="🥐"', 'icon="restaurant-outline"'),
        ("<Text style={{ fontSize: 28 }}>{item.emoji || '🥐'}</Text>",
         "<View style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Ionicons name=\"fast-food-outline\" size={20} color={COLORS.primary} /></View>"),
    ]
)

