import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, Receipt, Printer } from 'lucide-react';
import Topbar from '../components/Topbar';
import PrintReceiptModal from '../components/PrintReceiptModal';
import { useBakery } from '../store/bakeryStore';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Breads', 'Pastries', 'Cakes', 'Muffins', 'Drinks'];

export default function POS() {
  const { state, dispatch } = useBakery();
  const [activeCategory, setActiveCategory] = useState('All');
  const [payment, setPayment] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(null);

  const filtered = state.products.filter(p =>
    activeCategory === 'All' ? true : p.category === activeCategory
  );

  const subtotal = state.cart.reduce((s, i) => s + i.price * (Number(i.qty) || 0), 0);
  const discountAmt = subtotal * (discount / 100);
  const tax = (subtotal - discountAmt) * 0.15;
  const total = subtotal - discountAmt + tax;

  const handleAddToCart = (product) => {
    if (!product.available) return;
    dispatch({ type: 'ADD_TO_CART', product });
    toast.success(`${product.name} added!`, { duration: 1000, style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
  };

  const handlePlaceOrder = () => {
    if (state.cart.length === 0) { toast.error('Cart is empty!'); return; }
    const orderId = state.nextOrderId;
    const cartSnapshot = state.cart.map(i => ({ ...i, qty: Number(i.qty) || 1 }));
    dispatch({ type: 'PLACE_ORDER', payment });
    setShowReceipt({
      id: orderId,
      items: cartSnapshot,
      subtotal,
      discountAmt,
      tax,
      total,
      payment,
      cashier: state.currentUser.name,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    });
    toast.success('Order placed successfully!');
    setDiscount(0);
  };

  return (
    <div className="animate-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar title="Point of Sale" subtitle="Process customer orders quickly" />
      <div style={{ padding: '20px 32px', flex: 1, overflow: 'hidden' }}>
        <div className="pos-layout">
          {/* Products Panel */}
          <div className="pos-products">
            <div className="pos-categories">
              {CATEGORIES.map(c => (
                <button key={c} className={`category-btn ${activeCategory === c ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
            <div className="pos-products-grid">
              {filtered.map(p => (
                <div
                  key={p.id}
                  className={`product-card-pos ${!p.available ? 'unavailable' : ''}`}
                  onClick={() => handleAddToCart(p)}
                >
                  <div className="emoji">{p.image}</div>
                  <div className="name">{p.name}</div>
                  <div className="price">ETB {p.price.toFixed(2)}</div>
                  {!p.available && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4 }}>Out of stock</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Cart Panel */}
          <div className="pos-cart">
            <div className="pos-cart-header flex justify-between items-center">
              <span>🛒 Order</span>
              {state.cart.length > 0 && (
                <button className="btn btn-danger btn-sm" onClick={() => dispatch({ type: 'CLEAR_CART' })}>
                  Clear
                </button>
              )}
            </div>

            <div className="pos-cart-items">
              {state.cart.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">🛒</div>
                  <h3>Cart is empty</h3>
                  <p>Click products to add them</p>
                </div>
              ) : (
                state.cart.map(item => (
                  <div className="cart-item" key={item.id}>
                    <div className="cart-item-emoji">{item.image}</div>
                    <div className="cart-item-info">
                      <p>{item.name}</p>
                      <span>ETB {(item.price * (Number(item.qty) || 0)).toFixed(2)}</span>
                    </div>
                    <div className="cart-qty-ctrl">
                      <button
                        className="qty-btn"
                        onClick={() => dispatch({ type: 'UPDATE_CART_QTY', id: item.id, qty: (Number(item.qty) || 1) - 1 })}
                        title="Decrease by 1"
                      >
                        <Minus size={10} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        className="qty-input"
                        value={item.qty}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          if (val === '') {
                            dispatch({ type: 'UPDATE_CART_QTY', id: item.id, qty: '' });
                          } else if (!isNaN(val) && val >= 0) {
                            dispatch({ type: 'UPDATE_CART_QTY', id: item.id, qty: val });
                          }
                        }}
                        onBlur={() => {
                          if (!item.qty || item.qty < 1) {
                            dispatch({ type: 'UPDATE_CART_QTY', id: item.id, qty: 1 });
                          }
                        }}
                        onClick={(e) => e.target.select()}
                        aria-label="Quantity"
                        title="Click to write specific number"
                      />
                      <button
                        className="qty-btn"
                        onClick={() => dispatch({ type: 'UPDATE_CART_QTY', id: item.id, qty: (Number(item.qty) || 1) + 1 })}
                        title="Increase by 1"
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        className="qty-btn"
                        style={{ marginLeft: 4 }}
                        onClick={() => dispatch({ type: 'REMOVE_FROM_CART', id: item.id })}
                        title="Remove item"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pos-cart-footer">
              {/* Discount */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>DISCOUNT %</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 5, 10, 15, 20].map(d => (
                    <button
                      key={d}
                      style={{
                        flex: 1, padding: '5px 0', fontSize: 12, fontWeight: 600,
                        borderRadius: 6, cursor: 'pointer',
                        background: discount === d ? 'rgba(245,158,11,0.2)' : 'var(--bg-card2)',
                        border: discount === d ? '1px solid var(--amber-500)' : '1px solid var(--border)',
                        color: discount === d ? 'var(--amber-400)' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setDiscount(d)}
                    >{d}%</button>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="cart-total-row">
                <span>Subtotal</span>
                <span>ETB {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="cart-total-row" style={{ color: 'var(--success)' }}>
                  <span>Discount ({discount}%)</span>
                  <span>-ETB {discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="cart-total-row">
                <span>Tax (8%)</span>
                <span>ETB {tax.toFixed(2)}</span>
              </div>
              <div className="cart-total-row grand">
                <span>Total</span>
                <span>ETB {total.toFixed(2)}</span>
              </div>

              {/* Payment */}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>PAYMENT METHOD</label>
                <div className="payment-methods">
                  {['Cash', 'Card', 'Mobile'].map(m => (
                    <button key={m} className={`payment-btn ${payment === m ? 'active' : ''}`} onClick={() => setPayment(m)}>
                      {m === 'Cash' ? '💵' : m === 'Card' ? '💳' : '📱'} {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={handlePlaceOrder}
                disabled={state.cart.length === 0}
                style={{ opacity: state.cart.length === 0 ? 0.5 : 1 }}
              >
                <ShoppingBag size={18} />
                Place Order · ETB {total.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <PrintReceiptModal
          order={showReceipt}
          onClose={() => setShowReceipt(null)}
        />
      )}
    </div>
  );
}
