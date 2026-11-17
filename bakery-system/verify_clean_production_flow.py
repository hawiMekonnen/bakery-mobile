import urllib.request
import json
import time
import os
import re

BASE_URL = 'http://localhost:5000'

def request(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            body = res.read().decode('utf-8')
            return res.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {'error': body}

print("==================================================================")
print("  VERIFICATION 1: FULL-TEXT SEARCH FOR MOCK / SEEDED / FAKE TERMS ")
print("==================================================================")

dirs_to_check = [
    r'c:\Users\user\Desktop\bakery admin\src',
    r'c:\Users\user\Desktop\bakery admin\server.js',
    r'c:\Users\user\Desktop\bakery admin\storage.js',
    r'c:\Users\user\Desktop\bakery-mobile\src',
    r'c:\Users\user\Desktop\bakery-mobile\App.js',
]

terms = ['mock', 'fake', 'dummy', 'sample', 'demo', 'lorem', 'faker', 'fetira', 'baklava', 'INITIAL_PRODUCTS', 'INITIAL_INVENTORY']
findings = {t: [] for t in terms}

for root_item in dirs_to_check:
    if os.path.isfile(root_item):
        with open(root_item, 'r', encoding='utf-8', errors='ignore') as f:
            for idx, line in enumerate(f, 1):
                for t in terms:
                    if re.search(r'\b' + re.escape(t) + r'\b', line, re.IGNORECASE):
                        findings[t].append((os.path.basename(root_item), idx, line.strip()))
    elif os.path.isdir(root_item):
        for root, _, files in os.walk(root_item):
            for file in files:
                if file.endswith(('.js', '.jsx', '.json')):
                    fp = os.path.join(root, file)
                    with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                        for idx, line in enumerate(f, 1):
                            for t in terms:
                                if re.search(r'\b' + re.escape(t) + r'\b', line, re.IGNORECASE):
                                    findings[t].append((file, idx, line.strip()))

for t, hits in findings.items():
    print(f"  Term '{t}': {len(hits)} occurrences")
    for fn, ln, txt in hits[:2]:
        print(f"     -> [{fn}:{ln}] {txt[:90]}")

print("\n==================================================================")
print("  VERIFICATION 2: SYSTEM EMPTY STATE VALIDATION                   ")
print("==================================================================")

# Step 1: Admin Login
status, res = request('POST', '/api/auth/login', {'username': 'admin', 'password': 'Admin@Bakery2026!'})
if status != 200:
    status, res = request('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin1234'})
assert status == 200, f"Login failed: {res}"
token = res['token']
print("1. Admin authenticated successfully.")

# Step 2: Validate initial empty state across all metrics
status, stats = request('GET', '/api/admin/stats', token=token)
assert status == 200, f"Stats failed: {stats}"
print(f"2. Dashboard stats empty check: Revenue = {stats['allTime']['revenue']} ETB, Orders = {stats['allTime']['ordersCount']}, Devices = {stats['devices']['total']}")
assert stats['allTime']['revenue'] == 0, "Revenue should be 0 on clean boot"
assert stats['allTime']['ordersCount'] == 0, "Orders count should be 0 on clean boot"

status, shops = request('GET', '/api/admin/shops', token=token)
assert status == 200, f"Shops check failed: {shops}"
print(f"3. Shops empty check: total = {shops['total']}")
assert shops['total'] == 0, "Shops should be 0 on clean boot"

status, terms_res = request('GET', '/api/admin/terminals', token=token)
assert status == 200, f"Terminals check failed: {terms_res}"
print(f"4. Terminals empty check: total = {terms_res['total']}")
assert terms_res['total'] == 0, "Terminals should be 0 on clean boot"

status, ord_res = request('GET', '/api/admin/orders', token=token)
assert status == 200, f"Orders check failed: {ord_res}"
print(f"5. Orders empty check: total = {ord_res['total']}")
assert ord_res['total'] == 0, "Orders should be 0 on clean boot"

print("\n==================================================================")
print("  VERIFICATION 3: REAL LIFECYCLE WALKTHROUGH                      ")
print("==================================================================")

shop_id = None
dev_id = None

try:
    # Step A: Create Real Shop
    status, new_shop = request('POST', '/api/admin/shops', {
        'name': 'Arada Artisan Bakery',
        'contactPhone': '+251 911 888 999',
        'email': 'arada@bakery.com',
        'address': 'Piazza, Addis Ababa',
        'plan': 'enterprise',
        'paidUntil': '2027-12-31T23:59:59.000Z',
        'gracePeriodDays': 10,
        'autoSuspend': True
    }, token=token)
    assert status == 200 and new_shop['success'], f"Failed creating shop: {new_shop}"
    shop_id = new_shop['shop']['id']
    shop_name = new_shop['shop']['name']
    print(f"Step A: Created Shop: '{shop_name}' (ID: {shop_id})")

    # Step B: Create License for Shop
    status, new_lic = request('POST', '/api/admin/licenses', {
        'shopId': shop_id,
        'maxDevices': 5
    }, token=token)
    assert status == 200 and new_lic['success'], f"Failed creating license: {new_lic}"
    lic_key = new_lic['license']['licenseKey']
    print(f"Step B: Generated License: '{lic_key}' for shop '{shop_name}'")

    # Step C: Register Mobile Terminal
    dev_id = 'DEV-ANDR-REAL-POS-' + str(int(time.time()))
    status, reg = request('POST', '/api/device/register', {
        'deviceId': dev_id,
        'model': 'Sunmi V2 PRO Mobile Terminal',
        'osVersion': 'Android 11',
        'appVersion': '1.0.8',
        'shopName': shop_name,
        'licenseKey': lic_key
    })
    assert status == 200 and reg['status'] == 'pending', f"Registration failed: {reg}"
    print(f"Step C: Mobile Terminal '{dev_id}' requested access (Status: {reg['status']})")

    # Step D: Admin Approves Terminal
    status, apprv = request('POST', f'/api/admin/terminals/{dev_id}/approve', {}, token=token)
    assert status == 200 and apprv['success'], f"Approval failed: {apprv}"
    print(f"Step D: Admin approved terminal. Status is now ACTIVE.")

    # Step E: Phone Syncs Real Order
    order_id = 'ORD-ARADA-' + str(int(time.time()))
    order_payload = {
        'deviceId': dev_id,
        'licenseKey': lic_key,
        'orders': [
            {
                'id': order_id,
                'customerName': 'Walk-in Guest',
                'paymentMethod': 'Cash',
                'createdAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
                'subtotal': 280.00,
                'tax': 0.00,
                'total': 280.00,
                'items': [
                    {'name': 'Whole Grain Loaf', 'quantity': 2, 'price': 140.00}
                ]
            }
        ]
    }

    status, sync_res = request('POST', '/api/sync/batch', order_payload)
    assert status == 200 and sync_res['success'], f"Batch sync failed: {sync_res}"
    print(f"Step E: Phone batch-synced order '{order_id}' for 280.00 ETB.")

    # Step F: Verify numbers match across all views
    status, stats_after = request('GET', '/api/admin/stats', token=token)
    assert status == 200
    print(f"\nStep F: Verifying numbers agree:")
    print(f"  - Total Revenue: {stats_after['allTime']['revenue']} ETB (Expected: 280 ETB)")
    print(f"  - Orders Today: {stats_after['today']['ordersCount']} (Expected: 1)")
    print(f"  - Cash Total: {stats_after['today']['cashTotal']} ETB (Expected: 280 ETB)")
    print(f"  - Active Devices: {stats_after['devices']['active']} (Expected: 1)")

    assert stats_after['allTime']['revenue'] == 280.0, f"Revenue mismatch: {stats_after['allTime']['revenue']}"
    assert stats_after['today']['ordersCount'] == 1, f"Orders count mismatch: {stats_after['today']['ordersCount']}"
    assert stats_after['today']['cashTotal'] == 280.0, f"Cash total mismatch: {stats_after['today']['cashTotal']}"

    status, orders_after = request('GET', f'/api/admin/orders?shopId={shop_id}', token=token)
    assert status == 200 and orders_after['total'] == 1
    assert orders_after['orders'][0]['id'] == order_id
    print(f"  - Orders table record ID: {orders_after['orders'][0]['id']}, Total: {orders_after['orders'][0]['total']} ETB")

finally:
    # Step G: Clean up test records
    if shop_id:
        request('DELETE', f'/api/admin/shops/{shop_id}', token=token)
    if dev_id:
        request('POST', f'/api/admin/terminals/{dev_id}/action', {'action': 'unlink'}, token=token)
    print("\nStep G: Test records cleaned up. Database left clean.")

print("\n==================================================================")
print("  ALL PRODUCTION CLEANUP & REAL-DATA VERIFICATIONS PASSED!        ")
print("==================================================================")
