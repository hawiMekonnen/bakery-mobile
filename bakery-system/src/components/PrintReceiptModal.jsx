import { Printer, X } from 'lucide-react';
import { useBakery } from '../store/bakeryStore';

export default function PrintReceiptModal({ order, onClose }) {
  const { state } = useBakery();
  if (!order) return null;

  const items = order.items || [];
  const subtotal = order.subtotal !== undefined
    ? order.subtotal
    : items.reduce((s, i) => s + (i.price * (i.qty || i.quantity || 1)), 0);

  const discountAmt = order.discountAmt || 0;
  const tax = order.tax !== undefined ? order.tax : (subtotal - discountAmt) * 0.15;
  const total = order.total !== undefined ? order.total : (subtotal - discountAmt + tax);

  const dateStr = order.date || new Date().toISOString().split('T')[0];
  const timeStr = order.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const cashier = order.cashier || 'Cashier';
  const payment = order.payment || 'Cash';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal animate-in"
        style={{ maxWidth: 430, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🧾</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Print Receipt</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Order #{order.id}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>

        {/* Modal Body / Scrollable */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '16px', background: 'var(--bg-base)' }}>
          {/* Printable Receipt Paper Container */}
          <div id="printable-receipt-area" className="receipt-paper">
            {/* Header */}
            <div className="receipt-header">
              <div className="receipt-logo">🥐</div>
              <h2 className="receipt-store-name">BAKERPRO BAKERY</h2>
              <div className="receipt-meta">Artisan Breads, Pastries & Cafe</div>
              <div className="receipt-meta">Bole Road, Addis Ababa, Ethiopia</div>
              <div className="receipt-meta">Tel: +251 911 234 567</div>
              <div className="receipt-meta">TIN: 0045891234 · VAT Reg: Yes</div>
            </div>

            <div className="receipt-divider-double" />

            {/* Order & Date info */}
            <div className="receipt-info-row">
              <span>ORDER: #{order.id}</span>
              <span>{dateStr}</span>
            </div>
            <div className="receipt-info-row">
              <span>CASHIER: {cashier}</span>
              <span>{timeStr}</span>
            </div>

            <div className="receipt-divider" />

            {/* Column Headers */}
            <div className="receipt-table-header">
              <span className="col-item">ITEM</span>
              <span className="col-qty">QTY</span>
              <span className="col-price">PRICE</span>
              <span className="col-total">TOTAL</span>
            </div>

            <div className="receipt-divider-dashed" />

            {/* Items List */}
            <div className="receipt-items">
              {items.map((item, idx) => {
                const qty = item.qty || item.quantity || 1;
                const lineTotal = item.price * qty;
                const prod = state?.products?.find(p => p.id === item.productId || p.name === item.name);
                const emoji = item.image || item.emoji || prod?.image || '';

                return (
                  <div key={idx} className="receipt-item-row">
                    <div className="col-item item-name">
                      {emoji ? <span style={{ marginRight: 3 }}>{emoji}</span> : null}
                      {item.name}
                    </div>
                    <div className="col-qty">{qty}</div>
                    <div className="col-price">{item.price.toFixed(2)}</div>
                    <div className="col-total">{lineTotal.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            <div className="receipt-divider-dashed" />

            {/* Totals */}
            <div className="receipt-summary">
              <div className="receipt-summary-row">
                <span>SUBTOTAL</span>
                <span>ETB {subtotal.toFixed(2)}</span>
              </div>

              {discountAmt > 0 && (
                <div className="receipt-summary-row receipt-discount">
                  <span>DISCOUNT</span>
                  <span>-ETB {discountAmt.toFixed(2)}</span>
                </div>
              )}

              <div className="receipt-summary-row">
                <span>VAT (15%)</span>
                <span>ETB {tax.toFixed(2)}</span>
              </div>

              <div className="receipt-divider" />

              <div className="receipt-summary-row receipt-grand-total">
                <span>GRAND TOTAL</span>
                <span>ETB {total.toFixed(2)}</span>
              </div>

              <div className="receipt-summary-row" style={{ marginTop: 4, fontWeight: 700 }}>
                <span>PAID VIA</span>
                <span>{payment.toUpperCase()}</span>
              </div>
            </div>

            <div className="receipt-divider-double" />

            {/* Barcode & Footer */}
            <div className="receipt-footer">
              <div className="receipt-barcode">
                ||| | ||||| || |||||| | |||| ||| ||||||| |||
              </div>
              <div className="receipt-barcode-number">*{order.id}*</div>
              <div className="receipt-thankyou">Thank you for visiting BakerPro! 🎉</div>
              <div className="receipt-notice">Freshly baked every single day with love</div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer no-print" style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handlePrint}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Printer size={17} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

