import re

store_path = r'c:\Users\user\Desktop\bakery-mobile\src\store\BakeryStore.js'
with open(store_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update ADD_ORDER to include syncStatus: 'pending'
old_add = """    case 'ADD_ORDER': {
      const order = {
        ...action.payload,
        account: state.auth?.username || 'admin',
        createdBy: state.auth?.username || 'admin',
      };"""

new_add = """    case 'ADD_ORDER': {
      const order = {
        ...action.payload,
        syncStatus: 'pending',
        account: state.auth?.username || 'admin',
        createdBy: state.auth?.username || 'admin',
      };"""

if old_add in content:
    content = content.replace(old_add, new_add)
    print("Updated ADD_ORDER with syncStatus: 'pending'")

# 2. Add MARK_ORDERS_SYNCED case
if 'case \'MARK_ORDERS_SYNCED\':' not in content:
    target_pos = "case 'UPDATE_CREDENTIALS':"
    mark_case = """    case 'MARK_ORDERS_SYNCED': {
      const { syncedOrderIds = [] } = action.payload || {};
      const idSet = new Set(syncedOrderIds.map(String));
      const updatedOrders = (state.orders || []).map(o => {
        if (idSet.has(String(o.id))) {
          return { ...o, syncStatus: 'synced', syncedAt: new Date().toISOString() };
        }
        return o;
      });
      const updated = { ...state, orders: updatedOrders };
      persistStateImmediate(updated);
      return updated;
    }

    """
    content = content.replace(target_pos, mark_case + target_pos)
    print("Added MARK_ORDERS_SYNCED case")

# 3. Handle syncing results in background loop
old_sync_res = """        if (res.success) {
          setCloudSyncStatus({
            state: 'synced',
            lastSynced: res.timestamp,
            serverUrl: res.serverUrl,
            message: res.message,
          });"""

new_sync_res = """        if (res.success) {
          if (res.results && res.results.length > 0) {
            const confirmedIds = res.results.filter(r => r.status === 'synced' || r.status === 'duplicate').map(r => r.orderId);
            if (confirmedIds.length > 0) {
              dispatch({ type: 'MARK_ORDERS_SYNCED', payload: { syncedOrderIds: confirmedIds } });
            }
          }
          setCloudSyncStatus({
            state: 'synced',
            lastSynced: res.timestamp,
            serverUrl: res.serverUrl,
            message: res.message,
          });"""

if old_sync_res in content:
    content = content.replace(old_sync_res, new_sync_res)
    print("Updated background sync loop to dispatch MARK_ORDERS_SYNCED")

with open(store_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved BakeryStore.js successfully!")

