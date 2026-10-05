import sys

file_path = 'c:/Users/user/Desktop/bakery-mobile/src/store/BakeryStore.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_init = (
    "const INITIAL_STATE = {\n"
    "  products: INITIAL_PRODUCTS,\n"
    "  inventory: INITIAL_INVENTORY,\n"
    "  orders: INITIAL_ORDERS,\n"
    "  notifications: INITIAL_NOTIFICATIONS,\n"
    "  auth: DEFAULT_AUTH,\n"
    "  lastActiveDate: new Date().toISOString().slice(0, 10),\n"
    "};"
)

new_init = (
    "const DEFAULT_SECURITY = {\n"
    "  managerPin: '1234',\n"
    "  requirePinForReset: true,\n"
    "  requirePinForVoid: true,\n"
    "  autoLockMinutes: 0,\n"
    "};\n\n"
    "const INITIAL_STATE = {\n"
    "  products: INITIAL_PRODUCTS,\n"
    "  inventory: INITIAL_INVENTORY,\n"
    "  orders: INITIAL_ORDERS,\n"
    "  notifications: INITIAL_NOTIFICATIONS,\n"
    "  auth: DEFAULT_AUTH,\n"
    "  security: DEFAULT_SECURITY,\n"
    "  securityLogs: [\n"
    "    {\n"
    "      id: 'sec-init',\n"
    "      event: 'SYSTEM_STARTUP',\n"
    "      description: 'System security active with PIN protection and anti-tamper receipt hashing.',\n"
    "      timestamp: new Date().toISOString(),\n"
    "      user: 'admin',\n"
    "    },\n"
    "  ],\n"
    "  lastActiveDate: new Date().toISOString().slice(0, 10),\n"
    "};"
)

if old_init in content:
    content = content.replace(old_init, new_init)
    print("1. Updated INITIAL_STATE")

target_red = "    case 'UPDATE_CREDENTIALS': {"
sec_cases = (
    "    case 'UPDATE_MANAGER_PIN': {\n"
    "      const updated = {\n"
    "        ...state,\n"
    "        security: {\n"
    "          ...(state.security || DEFAULT_SECURITY),\n"
    "          managerPin: String(action.payload),\n"
    "        },\n"
    "        securityLogs: [\n"
    "          {\n"
    "            id: `sec-${Date.now()}`,\n"
    "            event: 'PIN_UPDATED',\n"
    "            description: 'Manager security PIN was changed.',\n"
    "            timestamp: new Date().toISOString(),\n"
    "            user: state.auth?.username || 'admin',\n"
    "          },\n"
    "          ...(state.securityLogs || []),\n"
    "        ].slice(0, 50),\n"
    "      };\n"
    "      persistStateImmediate(updated);\n"
    "      return updated;\n"
    "    }\n\n"
    "    case 'ADD_SECURITY_LOG': {\n"
    "      const newLog = {\n"
    "        id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,\n"
    "        ...action.payload,\n"
    "      };\n"
    "      const updated = {\n"
    "        ...state,\n"
    "        securityLogs: [newLog, ...(state.securityLogs || [])].slice(0, 50),\n"
    "      };\n"
    "      persistStateImmediate(updated);\n"
    "      return updated;\n"
    "    }\n\n"
    "    case 'UPDATE_CREDENTIALS': {"
)

if target_red in content and "UPDATE_MANAGER_PIN" not in content:
    content = content.replace(target_red, sec_cases)
    print("2. Added security reducer cases")

target_load = "        const savedAuth = (loadedData && loadedData.auth) ? loadedData.auth : DEFAULT_AUTH;"
rep_load = (
    "        const savedAuth = (loadedData && loadedData.auth) ? loadedData.auth : DEFAULT_AUTH;\n"
    "        const savedSecurity = (loadedData && loadedData.security) ? loadedData.security : DEFAULT_SECURITY;\n"
    "        const savedSecurityLogs = (loadedData && Array.isArray(loadedData.securityLogs))\n"
    "          ? loadedData.securityLogs\n"
    "          : [\n"
    "              {\n"
    "                id: 'sec-init',\n"
    "                event: 'SYSTEM_STARTUP',\n"
    "                description: 'System security active with PIN protection and anti-tamper receipt hashing.',\n"
    "                timestamp: new Date().toISOString(),\n"
    "                user: 'admin',\n"
    "              },\n"
    "            ];"
)

if target_load in content and "savedSecurity" not in content:
    content = content.replace(target_load, rep_load)
    print("3. Added savedSecurity restoration")

target_pay = "          notifications: savedNotifs,\n          lastActiveDate: todayDateStr,"
rep_pay = "          notifications: savedNotifs,\n          security: savedSecurity,\n          securityLogs: savedSecurityLogs,\n          lastActiveDate: todayDateStr,"

if target_pay in content and "security: savedSecurity" not in content:
    content = content.replace(target_pay, rep_pay)
    print("4. Added security to finalPayload")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("BakeryStore updated successfully!")
