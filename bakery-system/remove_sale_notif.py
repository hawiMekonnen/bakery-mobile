import os

store_path = r'c:\Users\user\Desktop\bakery-mobile\src\store\BakeryStore.js'
dashboard_path = r'c:\Users\user\Desktop\bakery-mobile\src\screens\DashboardScreen.js'

with open(store_path, 'r', encoding='utf-8') as f:
    store_code = f.read()

# 1. Update ADD_ORDER to NOT generate any sale notification
old_add_order = """    case 'ADD_ORDER': {
      const order = action.payload;
      const updatedProducts = state.products.map(p => {
        const matchingItem = order.items.find(i => i.id === p.id);
        if (matchingItem) {
          return { ...p, soldCount: (p.soldCount || 0) + matchingItem.quantity };
        }
        return p;
      });

      // Automatically generate a real-time sale notification
      const saleNotification = {
        id: `notif-${Date.now()}`,
        title: 'New Sale Completed',
        message: `Order ${order.id} for $${Number(order.total).toFixed(2)} (${order.paymentMethod}) completed.`,
        type: 'sale',
        timestamp: new Date().toISOString(),
        read: false,
      };

      return {
        ...state,
        orders: [order, ...state.orders],
        products: updatedProducts,
        notifications: [saleNotification, ...(state.notifications || [])].slice(0, 50),
      };
    }"""

new_add_order = """    case 'ADD_ORDER': {
      const order = action.payload;
      const updatedProducts = state.products.map(p => {
        const matchingItem = order.items.find(i => i.id === p.id);
        if (matchingItem) {
          return { ...p, soldCount: (p.soldCount || 0) + matchingItem.quantity };
        }
        return p;
      });

      return {
        ...state,
        orders: [order, ...state.orders],
        products: updatedProducts,
      };
    }"""

if old_add_order in store_code:
    store_code = store_code.replace(old_add_order, new_add_order)
    print("ADD_ORDER updated to remove sale notification.")
else:
    print("Warning: old_add_order not matched")

# 2. Filter out any sale notifications when reading stored state
old_notif_load = "notifications: parsed.notifications || INITIAL_NOTIFICATIONS,"
new_notif_load = "notifications: (parsed.notifications || INITIAL_NOTIFICATIONS).filter(n => n.type !== 'sale'),"

if old_notif_load in store_code:
    store_code = store_code.replace(old_notif_load, new_notif_load)
    print("Filter for sale notifications in state load updated.")
else:
    print("Warning: old_notif_load not matched")

with open(store_path, 'w', encoding='utf-8') as f:
    f.write(store_code)

# 3. Update DashboardScreen.js subtitle text
with open(dashboard_path, 'r', encoding='utf-8') as f:
    dash_code = f.read()

old_empty_sub = "Alerts for new sales and stock updates will show up here."
new_empty_sub = "Alerts for low stock ingredients and inventory updates will show up here."

if old_empty_sub in dash_code:
    dash_code = dash_code.replace(old_empty_sub, new_empty_sub)
    with open(dashboard_path, 'w', encoding='utf-8') as f:
        f.write(dash_code)
    print("DashboardScreen empty notification text updated.")
