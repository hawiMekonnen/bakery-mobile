import os, re

def update_pos_screen():
    fp = r"C:\Users\user\Desktop\bakery-mobile\src\screens\POSScreen.js"
    with open(fp, "r", encoding="utf-8") as f:
        c = f.read()

    # 1. Add amountReceived state
    c = c.replace(
        "const [paymentMethod, setPaymentMethod] = useState('Cash');",
        "const [paymentMethod, setPaymentMethod] = useState('Cash');\n  const [amountReceived, setAmountReceived] = useState('');"
    )

    # 2. Reset amountReceived in clearCart
    c = c.replace(
        "setPaymentMethod('Cash');",
        "setPaymentMethod('Cash');\n    setAmountReceived('');"
    )

    # 3. Add changeDue calculation
    old_calc = """  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);"""

    new_calc = """  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const parsedReceived = parseFloat(amountReceived);
  const effectiveReceived = isNaN(parsedReceived) ? total : parsedReceived;
  const changeDue = Math.max(0, effectiveReceived - total);"""

    c = c.replace(old_calc, new_calc)

    # 4. Include amountReceived and changeDue in order object
    old_order = """      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),"""

    new_order = """      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      amountReceived: parseFloat(effectiveReceived.toFixed(2)),
      changeDue: parseFloat(changeDue.toFixed(2)),"""

    c = c.replace(old_order, new_order)

    # 5. Add Amount Received UI and Change Due in checkoutForm
    old_checkout_form = """                <TextInput
                  style={styles.customerInput}
                  placeholder="Customer Name (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customerName}
                  onChangeText={setCustomerName}
                />

                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Subtotal</Text>
                  <Text style={styles.cartSummaryVal}>ETB {subtotal.toFixed(2)}</Text>
                </View>"""

    new_checkout_form = """                <TextInput
                  style={styles.customerInput}
                  placeholder="Customer Name (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customerName}
                  onChangeText={setCustomerName}
                />

                {paymentMethod === 'Cash' && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.formLabel}>AMOUNT RECEIVED (ETB)</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      <TextInput
                        style={[styles.customerInput, { flex: 1, marginBottom: 0, fontWeight: '700' }]}
                        placeholder={`e.g. ${total.toFixed(0)}`}
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="decimal-pad"
                        value={amountReceived}
                        onChangeText={setAmountReceived}
                      />
                      <TouchableOpacity
                        style={styles.quickAmountBtn}
                        onPress={() => setAmountReceived(total.toFixed(0))}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickAmountText}>Exact</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickAmountBtn}
                        onPress={() => {
                          const base = parseFloat(amountReceived) || total;
                          setAmountReceived(String(Math.ceil(base / 100) * 100 || 100));
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickAmountText}>Round</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.changeDueRow}>
                      <Text style={styles.changeDueLabel}>Change Due</Text>
                      <Text style={[styles.changeDueVal, { color: effectiveReceived >= total ? COLORS.success : '#EF4444' }]}>
                        ETB {changeDue.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Subtotal</Text>
                  <Text style={styles.cartSummaryVal}>ETB {subtotal.toFixed(2)}</Text>
                </View>"""

    c = c.replace(old_checkout_form, new_checkout_form)

    # 6. Add styles for quickAmountBtn, quickAmountText, changeDueRow, changeDueLabel, changeDueVal
    # And ensure completeOrderBtn has minHeight: 48
    old_btn = """  completeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    marginTop: 12,
  },"""

    new_btn = """  quickAmountBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  changeDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  changeDueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  changeDueVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  completeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    minHeight: 48,
    paddingVertical: 13,
    marginTop: 12,
    ...SHADOWS.sm,
  },"""

    c = c.replace(old_btn, new_btn)

    with open(fp, "w", encoding="utf-8") as f:
        f.write(c)

    print("POSScreen updated with change calculation and 48px button")

update_pos_screen()

