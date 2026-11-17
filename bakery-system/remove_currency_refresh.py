with open(r'c:\Users\user\Desktop\bakery admin\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Target block to remove: Currency Indicator and Manual Refresh Button
target_block = """            {/* Currency Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Currency:
              </span>
              <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
                ETB
              </span>
            </div>



            {/* Manual Refresh Button */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              title="Refresh dashboard data"
              aria-label="Refresh data"
            >
              <RefreshCw size={14} className={isRefreshing ? 'skeleton' : ''} />
              <span>Refresh</span>
            </button>"""

assert target_block in content or target_block.replace('\n', '\r\n') in content, "target_block not found in App.jsx"
content = content.replace(target_block.replace('\n', '\r\n'), '').replace(target_block, '')

with open(r'c:\Users\user\Desktop\bakery admin\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open(r'c:\Users\user\Desktop\bakery system\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed 'Currency' badge and 'Refresh' button from topbar successfully!")

