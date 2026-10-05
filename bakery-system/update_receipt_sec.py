import sys

file_path = 'c:/Users/user/Desktop/bakery-mobile/src/utils/receiptPrinter.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if "import { generateReceiptSecurityCode }" not in content:
    content = "import { generateReceiptSecurityCode } from '../services/bluetoothPrinterService';\n" + content

# 2. In generateReceiptHTML, add secCode
old_header_html = """export function generateReceiptHTML(order, businessName = 'Bakery', paperWidth = '58mm') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();"""

new_header_html = """export function generateReceiptHTML(order, businessName = 'Bakery', paperWidth = '58mm') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);"""

if old_header_html in content:
    content = content.replace(old_header_html, new_header_html)

# Add Security Code row in HTML info table
old_table_row = """          <tr>
            <td><strong>Cashier:</strong></td>
            <td style="text-align: right;">${order.createdBy || order.account || 'Staff'}</td>
          </tr>"""

new_table_row = """          <tr>
            <td><strong>Cashier:</strong></td>
            <td style="text-align: right;">${order.createdBy || order.account || 'Staff'}</td>
          </tr>
          <tr>
            <td><strong>Security Code:</strong></td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">${secCode}</td>
          </tr>"""

if old_table_row in content:
    content = content.replace(old_table_row, new_table_row)

# In tear-cut footer:
old_cut = """        <div class="tear-cut">- - - - - [ TEAR RECEIPT HERE ] - - - - -</div>"""
new_cut = """        <div class="tear-cut" style="font-weight: bold; margin-bottom: 3px;">*** SEC-VERIFIED: ${secCode} ***</div>
        <div class="tear-cut">- - - - - [ TEAR RECEIPT HERE ] - - - - -</div>"""

if old_cut in content:
    content = content.replace(old_cut, new_cut)

# In generateReceiptText:
old_text_fn = """export function generateReceiptText(order, businessName = 'Bakery') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();"""

new_text_fn = """export function generateReceiptText(order, businessName = 'Bakery') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);"""

if old_text_fn in content:
    content = content.replace(old_text_fn, new_text_fn)

old_text_sub = """Payment:  ${order.paymentMethod || 'Cash'}"""
new_text_sub = """Payment:  ${order.paymentMethod || 'Cash'}\nSecurity: ${secCode} (Anti-Tamper Verified)"""

if old_text_sub in content:
    content = content.replace(old_text_sub, new_text_sub)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated receiptPrinter.js with anti-tamper security codes!')
