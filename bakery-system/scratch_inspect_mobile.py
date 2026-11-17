import re

files = [
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\AnalyticsScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\DashboardScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\InventoryScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\ItemsSoldScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\OrdersScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\POSScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\ProductsScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\screens\ProfileScreen.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\services\bluetoothPrinterService.js',
    r'c:\Users\user\Desktop\bakery-mobile\src\utils\receiptPrinter.js'
]

for fp in files:
    with open(fp, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"\n================ {fp.split('\\')[-1]} ================")
    for i, l in enumerate(lines):
        if '$' in l:
            # show line if it's not pure template literal `${...}` without a dollar currency
            # e.g., `$${...}` or `>${...}` with money or `$` + number
            if re.search(r'\$\s*\{[^}]*(?:price|total|amount|cost|revenue|sales|subtotal|tax|discount|change|due|balance|cash|card|mobile|paid|sum)[^}]*\}', l, re.I) or re.search(r'\$\s*\d', l) or re.search(r'[\'"]\s*\$\s*[\'"]', l) or re.search(r'>\s*\$', l) or re.search(r'\$\s*\{[a-zA-Z0-9_\.]+\.toFixed', l):
                print(f"L{i+1}: {l.strip()}")

