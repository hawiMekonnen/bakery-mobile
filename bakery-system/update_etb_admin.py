with open(r'c:\Users\user\Desktop\bakery admin\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Currency state
old_curr_1 = "const [currency, setCurrency] = useState(localStorage.getItem('bakery_currency') || '$');"
new_curr_1 = "const currency = 'ETB ';"
assert old_curr_1 in content, "old_curr_1 not found"
content = content.replace(old_curr_1, new_curr_1)

# 2. handleCurrencyChange
old_handler = """  // Currency selection persistence
  const handleCurrencyChange = (val) => {
    setCurrency(val);
    localStorage.setItem('bakery_currency', val);
    addToast(`Currency set to ${val}`, 'info');
  };"""
content = content.replace(old_handler.replace('\n', '\r\n'), '').replace(old_handler, '')

# 3. Topbar currency selector
old_topbar = """            {/* Currency Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="topbar-curr-select" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Currency:
              </label>
              <select
                id="topbar-curr-select"
                className="form-select form-select-sm"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
              >
                <option value="$">$ (USD)</option>
                <option value="Br">Br (ETB)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </div>"""

new_topbar = """            {/* Currency Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Currency:
              </span>
              <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
                ETB
              </span>
            </div>"""

content = content.replace(old_topbar.replace('\n', '\r\n'), new_topbar.replace('\n', '\r\n')).replace(old_topbar, new_topbar)

with open(r'c:\Users\user\Desktop\bakery admin\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open(r'c:\Users\user\Desktop\bakery system\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated App.jsx successfully in both admin folders!")

