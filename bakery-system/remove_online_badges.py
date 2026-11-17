with open(r'c:\Users\user\Desktop\bakery admin\src\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove sidebar footer containing "Server online" card
target_sidebar_footer = """        <div className="sidebar-footer">
          <div className="server-status-card">
            <span className={`status-dot ${serverStatus ? '' : 'offline'}`} />
            <div className="server-status-details">
              <span className="server-status-title">
                {serverStatus ? 'Server online' : 'Server disconnected'}
              </span>
              <span className="server-status-desc">
                {orders.length} synced {pluralize(orders.length, 'order', 'orders')}
              </span>
            </div>
          </div>
        </div>"""

assert target_sidebar_footer in content or target_sidebar_footer.replace('\n', '\r\n') in content, "target_sidebar_footer not found"
content = content.replace(target_sidebar_footer.replace('\n', '\r\n'), '').replace(target_sidebar_footer, '')

# 2. Remove connection-indicator in topbar containing "Connected"
target_topbar_indicator = """            {/* Connection State Badge */}
            <div
              className={`connection-indicator ${serverStatus ? 'online' : 'offline'}`}
              title={lastSyncTime ? `Last synced: ${formatDateTime(lastSyncTime)}` : 'Waiting for connection'}
            >
              <span className={`status-dot ${serverStatus ? '' : 'offline'}`} />
              <span>{serverStatus ? 'Connected' : 'Offline'}</span>
            </div>"""

assert target_topbar_indicator in content or target_topbar_indicator.replace('\n', '\r\n') in content, "target_topbar_indicator not found"
content = content.replace(target_topbar_indicator.replace('\n', '\r\n'), '').replace(target_topbar_indicator, '')

# Write back to both bakery admin and bakery system
with open(r'c:\Users\user\Desktop\bakery admin\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open(r'c:\Users\user\Desktop\bakery system\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed 'Server online' and 'Connected' successfully from both admin workspaces!")

