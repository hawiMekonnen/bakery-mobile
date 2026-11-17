import urllib.request
import json
import time

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

print("=== 1. Testing Admin Login ===")
status, res = request('POST', '/api/auth/login', {'username': 'admin', 'password': 'admin1234'})
assert status == 200 and res.get('success'), f"Login failed: {res}"
token = res['token']
print("Admin logged in successfully! Token acquired.")

print("\n=== 2. Testing Shops & Multi-Shop Scale ===")
status, res = request('GET', '/api/admin/shops', token=token)
assert status == 200 and res.get('total') >= 1, f"Failed getting shops: {res}"
print(f"Shops count: {res['total']}. Initial shop: {res['shops'][0]['name']}")

# Create second client shop
status, new_shop = request('POST', '/api/admin/shops', {
    'name': 'Sarbet Artisan Cafe',
    'contactPhone': '+251 922 333 444',
    'email': 'sarbet@bakery.com',
    'address': 'Sarbet, Addis Ababa',
    'plan': 'standard',
    'paidUntil': '2027-06-30T23:59:59.000Z',
    'gracePeriodDays': 7,
    'autoSuspend': True
}, token=token)
assert status == 200 and new_shop.get('success'), f"Shop create failed: {new_shop}"
sarbet_shop_id = new_shop['shop']['id']
print(f"Created new shop: {new_shop['shop']['name']} ({sarbet_shop_id}) with license: {new_shop['license']['licenseKey']}")

print("\n=== 3. Testing Terminal Registration & Approval ===")
# Register phone 1 (for shop 1)
dev1_id = f"DEV-ANDR-TEST1-{int(time.time())}"
status, reg1 = request('POST', '/api/device/request-access', {
    'deviceId': dev1_id,
    'model': 'Samsung Galaxy A15',
    'osVersion': 'Android 14',
    'appVersion': '1.0.8',
    'shopName': 'Bakery POS Terminal'
})
assert status == 200 and reg1['status'] == 'pending', f"Registration 1 failed: {reg1}"
print(f"Phone 1 ({dev1_id}) registered as PENDING.")

# Approve phone 1
status, app1 = request('POST', f"/api/admin/devices/{dev1_id}/approve", {'shopName': 'Bakery POS Terminal'}, token=token)
assert status == 200 and app1['success'], f"Approval failed: {app1}"
print(f"Phone 1 approved by admin. Status now: {app1['device']['status']}")

# Register phone 2 (for shop 2)
dev2_id = f"DEV-IOS-TEST2-{int(time.time())}"
status, reg2 = request('POST', '/api/device/request-access', {
    'deviceId': dev2_id,
    'model': 'iPhone 15 Pro',
    'osVersion': 'iOS 17.5',
    'appVersion': '1.0.8',
    'shopName': 'Sarbet Artisan Cafe'
})
assert status == 200 and reg2['status'] == 'pending', f"Registration 2 failed: {reg2}"
status, app2 = request('POST', f"/api/admin/devices/{dev2_id}/approve", {'shopName': 'Sarbet Artisan Cafe'}, token=token)
assert status == 200 and app2['success'], f"Approval 2 failed: {app2}"
print(f"Phone 2 ({dev2_id}) registered and approved for Sarbet Cafe.")

print("\n=== 4. Testing Idempotent Batch Order Sync ===")
# Order batch from phone 1
test_order_id = f"ORD-TEST-{int(time.time())}"
orders_payload = [
    {
        'id': test_order_id,
        'createdAt': '2026-11-01T10:00:00.000Z',
        'customerName': 'Abel Tesfaye',
        'paymentMethod': 'Cash',
        'subtotal': 150,
        'tax': 7.5,
        'total': 157.5,
        'items': [{'name': 'Crispy Honey Fetira', 'quantity': 2, 'price': 75}]
    }
]

status, sync1 = request('POST', '/api/sync/batch', {
    'deviceId': dev1_id,
    'orders': orders_payload,
    'pendingCount': 1
})
assert status == 200 and sync1['synced'] == 1, f"Batch sync 1 failed: {sync1}"
print(f"Batch sync 1 succeeded: {sync1['synced']} new order(s) synced.")

# Send the EXACT SAME order batch again to verify IDEMPOTENCY
status, sync2 = request('POST', '/api/sync/batch', {
    'deviceId': dev1_id,
    'orders': orders_payload,
    'pendingCount': 0
})
assert status == 200 and sync2['duplicates'] == 1 and sync2['synced'] == 0, f"Idempotency failed: {sync2}"
print(f"Batch sync idempotency verified: 0 duplicates created ({sync2['duplicates']} duplicate recognized).")

print("\n=== 5. Testing Date Filtering API (Addis Ababa Timezone) ===")
status, ord_res = request('GET', '/api/admin/orders?page=1&limit=10&startDate=2026-11-01&endDate=2026-11-01', token=token)
assert status == 200, f"Orders query failed: {ord_res}"
print(f"Filtered orders for 2026-11-01 count: {ord_res['total']}. Totals: {ord_res['totals']['totalSales']} ETB")

print("\n=== 6. Testing Terminal Suspension, 403 Blocking Enforcement, & Audit Trail ===")
# Admin suspends Phone 1 with reason "Non-payment for month"
status, susp = request('POST', f"/api/admin/terminals/{dev1_id}/action", {
    'action': 'suspend',
    'reason': 'Monthly subscription unpaid'
}, token=token)
assert status == 200 and susp['device']['status'] == 'suspended', f"Suspend failed: {susp}"
print(f"Terminal {dev1_id} suspended in BakerAdmin with reason: {susp['device']['statusReason']}")

# Phone 1 now attempts to batch sync while suspended -> MUST RECEIVE 403 TERMINAL_SUSPENDED
status, blocked_res = request('POST', '/api/sync/batch', {
    'deviceId': dev1_id,
    'orders': [{'id': 'ORD-BLOCKED-ATTEMPT', 'total': 100}],
    'pendingCount': 1
})
assert status == 403, f"Expected 403 status but got {status}: {blocked_res}"
assert blocked_res.get('code') == 'TERMINAL_SUSPENDED', f"Expected TERMINAL_SUSPENDED code: {blocked_res}"
print(f"Blocking enforced: Suspended phone received HTTP 403 with code: {blocked_res['code']} and reason: {blocked_res.get('reason')}")

# Heartbeat also returns 403 with support contact
status, hb_res = request('POST', '/api/device/heartbeat', {'deviceId': dev1_id})
assert status == 403 and hb_res.get('code') == 'TERMINAL_SUSPENDED', f"Heartbeat blocking failed: {hb_res}"
print(f"Heartbeat blocking enforced: received support contact: {hb_res.get('supportContact')}")

# Verify audit trail recorded the suspension
status, audit_res = request('GET', f"/api/admin/audit-logs?terminalId={dev1_id}", token=token)
assert status == 200 and audit_res['total'] >= 1, f"Audit trail missing: {audit_res}"
print(f"Audit log recorded entry: action '{audit_res['logs'][0]['action']}' by '{audit_res['logs'][0]['adminUser']}' - reason: '{audit_res['logs'][0]['reason']}'")

print("\n=== 7. Testing Terminal Reactivation ===")
status, act = request('POST', f"/api/admin/terminals/{dev1_id}/action", {
    'action': 'activate',
    'reason': 'Payment received and verified'
}, token=token)
assert status == 200 and act['device']['status'] == 'active', f"Activation failed: {act}"
print(f"Terminal {dev1_id} reactivated by admin.")

# Phone 1 heartbeat now succeeds with 200
status, hb_act = request('POST', '/api/device/heartbeat', {'deviceId': dev1_id})
assert status == 200 and hb_act.get('status') == 'active', f"Heartbeat after activation failed: {hb_act}"
print("Phone 1 heartbeat immediately returns 200 OK after reactivation.")

print("\n========================================================")
print("  ALL SCALE, BLOCKING, AND BATCH SYNC TESTS PASSED!     ")
print("========================================================")

