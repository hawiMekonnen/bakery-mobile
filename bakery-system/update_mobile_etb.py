import os
import re

mobile_dir = r'c:\Users\user\Desktop\bakery-mobile'

# 1. Update colors.js
colors_path = os.path.join(mobile_dir, 'src', 'theme', 'colors.js')
with open(colors_path, 'r', encoding='utf-8') as f:
    colors_content = f.read()
if 'export const CURRENCY' not in colors_content:
    colors_content += "\nexport const CURRENCY = 'ETB ';\n"
    with open(colors_path, 'w', encoding='utf-8') as f:
        f.write(colors_content)
    print("Added CURRENCY = 'ETB ' to colors.js")

# Helper function to replace in file
def replace_in_file(rel_path, replacements):
    fp = os.path.join(mobile_dir, rel_path)
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for old, new in replacements:
        if old not in content:
            print(f"WARNING: Target not found in {rel_path}:\n{old[:60]}...")
        else:
            content = content.replace(old, new)
    if content != orig:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {rel_path}")
    else:
        print(f"No changes made to {rel_path}")

# 2. AnalyticsScreen.js
replace_in_file('src/screens/AnalyticsScreen.js', [
    ('subtitle={`Period: $${periodRevenue.toFixed(2)}', 'subtitle={`Period: ETB ${periodRevenue.toFixed(2)}'),
    ('All time: $${allTimeRevenue.toFixed(2)}`}', 'All time: ETB ${allTimeRevenue.toFixed(2)}`}'),
    ('<Text style={styles.heroAmount}>${periodRevenue.toFixed(2)}</Text>', '<Text style={styles.heroAmount}>ETB {periodRevenue.toFixed(2)}</Text>'),
    ('${cashTotal.toFixed(2)}', 'ETB {cashTotal.toFixed(2)}'),
    ('${cardTotal.toFixed(2)}', 'ETB {cardTotal.toFixed(2)}'),
    ('${mobileTotal.toFixed(2)}', 'ETB {mobileTotal.toFixed(2)}'),
    ('Cash: ${dayCash.toFixed(0)} | Card: ${dayCard.toFixed(0)} | Mobile: ${dayMobile.toFixed(0)}', 'Cash: ETB {dayCash.toFixed(0)} | Card: ETB {dayCard.toFixed(0)} | Mobile: ETB {dayMobile.toFixed(0)}'),
    ('<Text style={styles.dailyHistoryTotal}>${dayTotal.toFixed(2)}</Text>', '<Text style={styles.dailyHistoryTotal}>ETB {dayTotal.toFixed(2)}</Text>')
])

# 3. DashboardScreen.js
replace_in_file('src/screens/DashboardScreen.js', [
    ('<Text style={styles.primaryCardValue}>${todayRevenue.toFixed(2)}</Text>', '<Text style={styles.primaryCardValue}>ETB {todayRevenue.toFixed(2)}</Text>'),
    ('${totalAllTimeRevenue.toFixed(2)} in database', 'ETB {totalAllTimeRevenue.toFixed(2)} in database'),
    ('${todayCash.toFixed(2)}', 'ETB {todayCash.toFixed(2)}'),
    ('${todayCard.toFixed(2)}', 'ETB {todayCard.toFixed(2)}'),
    ('${todayMobile.toFixed(2)}', 'ETB {todayMobile.toFixed(2)}'),
    ('<Text style={styles.incomeTotalVal}>${todayRevenue.toFixed(2)}</Text>', '<Text style={styles.incomeTotalVal}>ETB {todayRevenue.toFixed(2)}</Text>'),
    ('<Text style={styles.recentOrderTotal}>${Number(item.total).toFixed(2)}</Text>', '<Text style={styles.recentOrderTotal}>ETB {Number(item.total).toFixed(2)}</Text>'),
    ('<Text style={styles.topProductPrice}>${Number(p.price).toFixed(2)}</Text>', '<Text style={styles.topProductPrice}>ETB {Number(p.price).toFixed(2)}</Text>')
])

# 4. InventoryScreen.js
replace_in_file('src/screens/InventoryScreen.js', [
    ('• ${Number(item.costPerUnit || 0).toFixed(2)}/{item.unit}', '• ETB {Number(item.costPerUnit || 0).toFixed(2)}/{item.unit}')
])

# 5. ItemsSoldScreen.js
replace_in_file('src/screens/ItemsSoldScreen.js', [
    ('• ${Number(item.price).toFixed(2)}', '• ETB {Number(item.price).toFixed(2)}')
])

# 6. OrdersScreen.js
replace_in_file('src/screens/OrdersScreen.js', [
    ('sales • $${totalRevenue.toFixed(2)} total', 'sales • ETB ${totalRevenue.toFixed(2)} total'),
    ('<Text style={styles.orderTotal}>${Number(item.total).toFixed(2)}</Text>', '<Text style={styles.orderTotal}>ETB {Number(item.total).toFixed(2)}</Text>'),
    ('${(Number(it.price) * Number(it.quantity)).toFixed(2)}', 'ETB {(Number(it.price) * Number(it.quantity)).toFixed(2)}'),
    ('<Text style={styles.receiptTotalVal}>${Number(selectedOrder.subtotal).toFixed(2)}</Text>', '<Text style={styles.receiptTotalVal}>ETB {Number(selectedOrder.subtotal).toFixed(2)}</Text>'),
    ('<Text style={styles.receiptTotalVal}>${Number(selectedOrder.tax).toFixed(2)}</Text>', '<Text style={styles.receiptTotalVal}>ETB {Number(selectedOrder.tax).toFixed(2)}</Text>'),
    ('<Text style={styles.receiptGrandTotalVal}>${Number(selectedOrder.total).toFixed(2)}</Text>', '<Text style={styles.receiptGrandTotalVal}>ETB {Number(selectedOrder.total).toFixed(2)}</Text>')
])

# 7. POSScreen.js
replace_in_file('src/screens/POSScreen.js', [
    ('{totalItemsCount} | ${total.toFixed(0)}', '{totalItemsCount} | ETB {total.toFixed(0)}'),
    ('<Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>', '<Text style={styles.productPrice}>ETB {Number(item.price).toFixed(2)}</Text>'),
    ('<Text style={styles.floatingCartTotal}>${total.toFixed(2)} total</Text>', '<Text style={styles.floatingCartTotal}>ETB {total.toFixed(2)} total</Text>'),
    ('<Text style={styles.cartItemPrice}>${Number(item.price).toFixed(2)} each</Text>', '<Text style={styles.cartItemPrice}>ETB {Number(item.price).toFixed(2)} each</Text>'),
    ('<Text style={styles.cartSummaryVal}>${subtotal.toFixed(2)}</Text>', '<Text style={styles.cartSummaryVal}>ETB {subtotal.toFixed(2)}</Text>'),
    ('<Text style={styles.cartSummaryVal}>${tax.toFixed(2)}</Text>', '<Text style={styles.cartSummaryVal}>ETB {tax.toFixed(2)}</Text>'),
    ('<Text style={styles.cartGrandTotalVal}>${total.toFixed(2)}</Text>', '<Text style={styles.cartGrandTotalVal}>ETB {total.toFixed(2)}</Text>'),
    ('<Text style={styles.completeOrderText}>Complete Sale (${total.toFixed(2)})</Text>', '<Text style={styles.completeOrderText}>Complete Sale (ETB {total.toFixed(2)})</Text>'),
    ('<Text style={styles.successAmount}>${Number(lastCompletedOrder.total).toFixed(2)}</Text>', '<Text style={styles.successAmount}>ETB {Number(lastCompletedOrder.total).toFixed(2)}</Text>')
])

# 8. ProductsScreen.js
replace_in_file('src/screens/ProductsScreen.js', [
    ('Cost: ${Number(item.cost || 0).toFixed(2)}', 'Cost: ETB {Number(item.cost || 0).toFixed(2)}'),
    ('<Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>', '<Text style={styles.itemPrice}>ETB {Number(item.price).toFixed(2)}</Text>')
])

# 9. ProfileScreen.js
replace_in_file('src/screens/ProfileScreen.js', [
    ('${todayRevenue.toFixed(2)}', 'ETB {todayRevenue.toFixed(2)}')
])

# 10. bluetoothPrinterService.js
replace_in_file('src/services/bluetoothPrinterService.js', [
    ("const amountStr = '$' + (Number(item.price) * Number(item.quantity)).toFixed(2);", "const amountStr = 'ETB ' + (Number(item.price) * Number(item.quantity)).toFixed(2);"),
    ("addLine(padBetween('Subtotal:', '$' + Number(order.subtotal || 0).toFixed(2)));", "addLine(padBetween('Subtotal:', 'ETB ' + Number(order.subtotal || 0).toFixed(2)));"),
    ("addLine(padBetween('Tax (5%):', '$' + Number(order.tax || 0).toFixed(2)));", "addLine(padBetween('Tax (5%):', 'ETB ' + Number(order.tax || 0).toFixed(2)));"),
    ("addLine(padBetween('TOTAL:', '$' + Number(order.total || 0).toFixed(2)));", "addLine(padBetween('TOTAL:', 'ETB ' + Number(order.total || 0).toFixed(2)));"),
    ('<td style="text-align: right; padding: 2px 0;">$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>', '<td style="text-align: right; padding: 2px 0;">ETB ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>'),
    ('<tr><td>Subtotal:</td><td style="text-align: right;">$${Number(order.subtotal || 0).toFixed(2)}</td></tr>', '<tr><td>Subtotal:</td><td style="text-align: right;">ETB ${Number(order.subtotal || 0).toFixed(2)}</td></tr>'),
    ('<tr><td>Tax (5%):</td><td style="text-align: right;">$${Number(order.tax || 0).toFixed(2)}</td></tr>', '<tr><td>Tax (5%):</td><td style="text-align: right;">ETB ${Number(order.tax || 0).toFixed(2)}</td></tr>'),
    ('<tr class="bold" style="font-size: 13px;"><td>TOTAL:</td><td style="text-align: right;">$${Number(order.total || 0).toFixed(2)}</td></tr>', '<tr class="bold" style="font-size: 13px;"><td>TOTAL:</td><td style="text-align: right;">ETB ${Number(order.total || 0).toFixed(2)}</td></tr>')
])

# 11. receiptPrinter.js
replace_in_file('src/utils/receiptPrinter.js', [
    ('<td style="padding: 3px 0; font-size: 11px; text-align: right; white-space: nowrap;">$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>', '<td style="padding: 3px 0; font-size: 11px; text-align: right; white-space: nowrap;">ETB ${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>'),
    ('<td style="text-align: right;">$${Number(order.subtotal || 0).toFixed(2)}</td>', '<td style="text-align: right;">ETB ${Number(order.subtotal || 0).toFixed(2)}</td>'),
    ('<td style="text-align: right;">$${Number(order.tax || 0).toFixed(2)}</td>', '<td style="text-align: right;">ETB ${Number(order.tax || 0).toFixed(2)}</td>'),
    ('<td style="text-align: right; padding-top: 4px;">$${Number(order.total || 0).toFixed(2)}</td>', '<td style="text-align: right; padding-top: 4px;">ETB ${Number(order.total || 0).toFixed(2)}</td>'),
    (".map(i => `${i.name} x${i.quantity}  $${(Number(i.price) * Number(i.quantity)).toFixed(2)}`)", ".map(i => `${i.name} x${i.quantity}  ETB ${(Number(i.price) * Number(i.quantity)).toFixed(2)}`)"),
    ("Subtotal: $${Number(order.subtotal || 0).toFixed(2)}", "Subtotal: ETB ${Number(order.subtotal || 0).toFixed(2)}"),
    ("Tax (5%): $${Number(order.tax || 0).toFixed(2)}", "Tax (5%): ETB ${Number(order.tax || 0).toFixed(2)}"),
    ("TOTAL:    $${Number(order.total || 0).toFixed(2)}", "TOTAL:    ETB ${Number(order.total || 0).toFixed(2)}")
])

print("Finished mobile updates!")

