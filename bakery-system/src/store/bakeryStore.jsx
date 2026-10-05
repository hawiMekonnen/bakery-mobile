import { createContext, useContext, useReducer } from 'react';

// ─── Initial Data ──────────────────────────────────────────────────────────────
const initialState = {
  currentUser: { id: 1, name: 'Admin User', role: 'admin', avatar: 'AU' },

  products: [
    { id: 1, name: 'Croissant', category: 'Pastries', price: 2.50, cost: 0.90, image: '🥐', available: true, sold: 142 },
    { id: 2, name: 'Sourdough Loaf', category: 'Breads', price: 6.00, cost: 1.80, image: '🍞', available: true, sold: 87 },
    { id: 3, name: 'Chocolate Cake', category: 'Cakes', price: 28.00, cost: 9.50, image: '🎂', available: true, sold: 34 },
    { id: 4, name: 'Blueberry Muffin', category: 'Muffins', price: 3.00, cost: 0.95, image: '🧁', available: true, sold: 211 },
    { id: 5, name: 'Cinnamon Roll', category: 'Pastries', price: 3.50, cost: 1.10, image: '🌀', available: true, sold: 178 },
    { id: 6, name: 'Baguette', category: 'Breads', price: 2.80, cost: 0.70, image: '🥖', available: true, sold: 95 },
    { id: 7, name: 'Strawberry Tart', category: 'Pastries', price: 4.50, cost: 1.60, image: '🍓', available: false, sold: 62 },
    { id: 8, name: 'Espresso', category: 'Drinks', price: 2.00, cost: 0.40, image: '☕', available: true, sold: 320 },
    { id: 9, name: 'Latte', category: 'Drinks', price: 3.50, cost: 0.80, image: '🥛', available: true, sold: 195 },
    { id: 10, name: 'Cheesecake Slice', category: 'Cakes', price: 5.50, cost: 2.20, image: '🍰', available: true, sold: 74 },
  ],

  ingredients: [
    { id: 1, name: 'All-Purpose Flour', unit: 'kg', quantity: 45.5, costPerUnit: 1.20, reorderLevel: 10, category: 'Dry Goods' },
    { id: 2, name: 'Butter', unit: 'kg', quantity: 12.0, costPerUnit: 8.50, reorderLevel: 5, category: 'Dairy' },
    { id: 3, name: 'Sugar', unit: 'kg', quantity: 28.0, costPerUnit: 1.10, reorderLevel: 8, category: 'Dry Goods' },
    { id: 4, name: 'Eggs', unit: 'dozen', quantity: 8.5, costPerUnit: 3.20, reorderLevel: 3, category: 'Dairy' },
    { id: 5, name: 'Whole Milk', unit: 'liter', quantity: 22.0, costPerUnit: 1.40, reorderLevel: 5, category: 'Dairy' },
    { id: 6, name: 'Yeast', unit: 'kg', quantity: 2.1, costPerUnit: 12.00, reorderLevel: 0.5, category: 'Dry Goods' },
    { id: 7, name: 'Salt', unit: 'kg', quantity: 5.0, costPerUnit: 0.60, reorderLevel: 1, category: 'Dry Goods' },
    { id: 8, name: 'Vanilla Extract', unit: 'liter', quantity: 1.2, costPerUnit: 25.00, reorderLevel: 0.3, category: 'Flavoring' },
    { id: 9, name: 'Cocoa Powder', unit: 'kg', quantity: 3.5, costPerUnit: 9.00, reorderLevel: 1, category: 'Dry Goods' },
    { id: 10, name: 'Baking Powder', unit: 'kg', quantity: 1.8, costPerUnit: 4.50, reorderLevel: 0.5, category: 'Dry Goods' },
    { id: 11, name: 'Cream Cheese', unit: 'kg', quantity: 4.2, costPerUnit: 11.00, reorderLevel: 1.5, category: 'Dairy' },
    { id: 12, name: 'Coffee Beans', unit: 'kg', quantity: 6.0, costPerUnit: 18.00, reorderLevel: 2, category: 'Drinks' },
  ],

  orders: generateOrders(),

  expenses: [
    { id: 1, category: 'Rent', amount: 1500, description: 'Monthly rent', date: '2026-09-01', recurring: true },
    { id: 2, category: 'Utilities', amount: 280, description: 'Electricity & water', date: '2026-09-05', recurring: true },
    { id: 3, category: 'Staff Wages', amount: 3200, description: 'Staff wages Sept', date: '2026-09-30', recurring: true },
    { id: 4, category: 'Equipment', amount: 450, description: 'Mixer repair', date: '2026-09-12', recurring: false },
    { id: 5, category: 'Marketing', amount: 150, description: 'Social media ads', date: '2026-09-10', recurring: false },
    { id: 6, category: 'Packaging', amount: 220, description: 'Boxes & bags', date: '2026-09-08', recurring: false },
  ],

  staff: [
    { id: 1, name: 'Maria Santos', role: 'Head Baker', email: 'maria@bakery.com', phone: '+1-555-0101', salary: 1800, status: 'active', clockedIn: true, clockIn: '06:00' },
    { id: 2, name: 'James Okonkwo', role: 'Cashier', email: 'james@bakery.com', phone: '+1-555-0102', salary: 1200, status: 'active', clockedIn: true, clockIn: '08:00' },
    { id: 3, name: 'Aisha Kamara', role: 'Pastry Chef', email: 'aisha@bakery.com', phone: '+1-555-0103', salary: 1600, status: 'active', clockedIn: false, clockIn: null },
    { id: 4, name: 'Carlos Mendes', role: 'Delivery', email: 'carlos@bakery.com', phone: '+1-555-0104', salary: 1100, status: 'active', clockedIn: false, clockIn: null },
    { id: 5, name: 'Sophie Laurent', role: 'Barista', email: 'sophie@bakery.com', phone: '+1-555-0105', salary: 1300, status: 'inactive', clockedIn: false, clockIn: null },
  ],

  cart: [],
  nextOrderId: 1100,
  nextProductId: 11,
  nextIngredientId: 13,
  nextExpenseId: 7,
  nextStaffId: 6,
};

function generateOrders() {
  const orders = [];
  const products = [
    { id: 1, name: 'Croissant', price: 2.50 },
    { id: 2, name: 'Sourdough Loaf', price: 6.00 },
    { id: 3, name: 'Chocolate Cake', price: 28.00 },
    { id: 4, name: 'Blueberry Muffin', price: 3.00 },
    { id: 5, name: 'Cinnamon Roll', price: 3.50 },
    { id: 6, name: 'Baguette', price: 2.80 },
    { id: 8, name: 'Espresso', price: 2.00 },
    { id: 9, name: 'Latte', price: 3.50 },
    { id: 10, name: 'Cheesecake Slice', price: 5.50 },
  ];
  const methods = ['Cash', 'Card', 'Mobile'];
  const cashiers = ['Maria Santos', 'James Okonkwo', 'Sophie Laurent'];

  let id = 1000;
  for (let d = 30; d >= 0; d--) {
    const date = new Date('2026-09-24');
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    const ordersPerDay = Math.floor(Math.random() * 15) + 8;

    for (let o = 0; o < ordersPerDay; o++) {
      const numItems = Math.floor(Math.random() * 4) + 1;
      const items = [];
      let total = 0;
      for (let i = 0; i < numItems; i++) {
        const p = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        items.push({ productId: p.id, name: p.name, price: p.price, quantity: qty });
        total += p.price * qty;
      }
      const hour = Math.floor(Math.random() * 12) + 7;
      const min = Math.floor(Math.random() * 60);
      orders.push({
        id: id++,
        items,
        total: parseFloat(total.toFixed(2)),
        payment: methods[Math.floor(Math.random() * methods.length)],
        cashier: cashiers[Math.floor(Math.random() * cashiers.length)],
        date: dateStr,
        time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        status: 'completed',
      });
    }
  }
  return orders;
}

// ─── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    // Cart
    case 'ADD_TO_CART': {
      const existing = state.cart.find(i => i.id === action.product.id);
      if (existing) {
        return { ...state, cart: state.cart.map(i => i.id === action.product.id ? { ...i, qty: i.qty + 1 } : i) };
      }
      return { ...state, cart: [...state.cart, { ...action.product, qty: 1 }] };
    }
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => i.id !== action.id) };
    case 'UPDATE_CART_QTY':
      return {
        ...state,
        cart: state.cart.map(i => i.id === action.id ? { ...i, qty: action.qty } : i)
          .filter(i => i.qty === '' || i.qty > 0)
      };
    case 'CLEAR_CART':
      return { ...state, cart: [] };

    // Orders
    case 'PLACE_ORDER': {
      const newOrder = {
        id: state.nextOrderId,
        items: state.cart.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: Number(i.qty) || 1 })),
        total: state.cart.reduce((s, i) => s + i.price * (Number(i.qty) || 1), 0),
        payment: action.payment,
        cashier: state.currentUser.name,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        status: 'completed',
      };
      const updatedProducts = state.products.map(p => {
        const cartItem = state.cart.find(c => c.id === p.id);
        return cartItem ? { ...p, sold: p.sold + (Number(cartItem.qty) || 1) } : p;
      });
      return { ...state, orders: [newOrder, ...state.orders], cart: [], nextOrderId: state.nextOrderId + 1, products: updatedProducts };
    }

    // Products
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, { ...action.product, id: state.nextProductId, sold: 0 }], nextProductId: state.nextProductId + 1 };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.product.id ? action.product : p) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.id) };
    case 'TOGGLE_PRODUCT_AVAILABILITY':
      return { ...state, products: state.products.map(p => p.id === action.id ? { ...p, available: !p.available } : p) };

    // Ingredients
    case 'ADD_INGREDIENT':
      return { ...state, ingredients: [...state.ingredients, { ...action.ingredient, id: state.nextIngredientId }], nextIngredientId: state.nextIngredientId + 1 };
    case 'UPDATE_INGREDIENT':
      return { ...state, ingredients: state.ingredients.map(i => i.id === action.ingredient.id ? action.ingredient : i) };
    case 'DELETE_INGREDIENT':
      return { ...state, ingredients: state.ingredients.filter(i => i.id !== action.id) };
    case 'RESTOCK_INGREDIENT':
      return { ...state, ingredients: state.ingredients.map(i => i.id === action.id ? { ...i, quantity: i.quantity + action.amount } : i) };

    // Expenses
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, { ...action.expense, id: state.nextExpenseId }], nextExpenseId: state.nextExpenseId + 1 };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) };

    // Staff
    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, { ...action.member, id: state.nextStaffId, clockedIn: false, clockIn: null }], nextStaffId: state.nextStaffId + 1 };
    case 'UPDATE_STAFF':
      return { ...state, staff: state.staff.map(s => s.id === action.member.id ? action.member : s) };
    case 'DELETE_STAFF':
      return { ...state, staff: state.staff.filter(s => s.id !== action.id) };
    case 'TOGGLE_CLOCK':
      return {
        ...state, staff: state.staff.map(s => s.id === action.id ? {
          ...s,
          clockedIn: !s.clockedIn,
          clockIn: !s.clockedIn ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null
        } : s)
      };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────
const BakeryContext = createContext(null);

export function BakeryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <BakeryContext.Provider value={{ state, dispatch }}>{children}</BakeryContext.Provider>;
}

export function useBakery() {
  return useContext(BakeryContext);
}
