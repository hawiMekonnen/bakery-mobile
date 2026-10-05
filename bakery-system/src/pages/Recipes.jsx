import { useMemo, useState } from 'react';
import { ChefHat, TrendingUp } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useBakery } from '../store/bakeryStore';

export default function Recipes() {
  const { state } = useBakery();
  const [selected, setSelected] = useState(state.products[0]?.id || null);
  const [simPrice, setSimPrice] = useState('');

  const product = state.products.find(p => p.id === selected);

  // Simulate recipe ingredients per product (static mapping for demo)
  const recipeMap = useMemo(() => {
    const map = {};
    state.products.forEach(p => {
      // Assign plausible ingredients based on category
      if (p.category === 'Breads') {
        map[p.id] = [
          { ingredientId: 1, qty: 0.25, name: 'All-Purpose Flour', unit: 'kg' },
          { ingredientId: 2, qty: 0.03, name: 'Butter', unit: 'kg' },
          { ingredientId: 6, qty: 0.005, name: 'Yeast', unit: 'kg' },
          { ingredientId: 7, qty: 0.005, name: 'Salt', unit: 'kg' },
        ];
      } else if (p.category === 'Pastries') {
        map[p.id] = [
          { ingredientId: 1, qty: 0.15, name: 'All-Purpose Flour', unit: 'kg' },
          { ingredientId: 2, qty: 0.08, name: 'Butter', unit: 'kg' },
          { ingredientId: 3, qty: 0.05, name: 'Sugar', unit: 'kg' },
          { ingredientId: 4, qty: 0.1, name: 'Eggs', unit: 'dozen' },
        ];
      } else if (p.category === 'Cakes') {
        map[p.id] = [
          { ingredientId: 1, qty: 0.3, name: 'All-Purpose Flour', unit: 'kg' },
          { ingredientId: 2, qty: 0.15, name: 'Butter', unit: 'kg' },
          { ingredientId: 3, qty: 0.2, name: 'Sugar', unit: 'kg' },
          { ingredientId: 4, qty: 0.25, name: 'Eggs', unit: 'dozen' },
          { ingredientId: 9, qty: 0.05, name: 'Cocoa Powder', unit: 'kg' },
          { ingredientId: 8, qty: 0.01, name: 'Vanilla Extract', unit: 'liter' },
        ];
      } else if (p.category === 'Muffins') {
        map[p.id] = [
          { ingredientId: 1, qty: 0.12, name: 'All-Purpose Flour', unit: 'kg' },
          { ingredientId: 2, qty: 0.06, name: 'Butter', unit: 'kg' },
          { ingredientId: 3, qty: 0.07, name: 'Sugar', unit: 'kg' },
          { ingredientId: 4, qty: 0.08, name: 'Eggs', unit: 'dozen' },
          { ingredientId: 10, qty: 0.008, name: 'Baking Powder', unit: 'kg' },
        ];
      } else if (p.category === 'Drinks') {
        map[p.id] = [
          { ingredientId: 12, qty: 0.018, name: 'Coffee Beans', unit: 'kg' },
          { ingredientId: 5, qty: 0.15, name: 'Whole Milk', unit: 'liter' },
        ];
      }
    });
    return map;
  }, [state.products]);

  const recipe = recipeMap[selected] || [];

  const calcCost = useMemo(() => {
    return recipe.reduce((sum, r) => {
      const ing = state.ingredients.find(i => i.id === r.ingredientId);
      return sum + (ing ? ing.costPerUnit * r.qty : 0);
    }, 0);
  }, [recipe, state.ingredients]);

  const simCost = useMemo(() => {
    if (!simPrice) return null;
    const newMargin = ((parseFloat(simPrice) - calcCost) / parseFloat(simPrice)) * 100;
    return { price: parseFloat(simPrice), margin: newMargin };
  }, [simPrice, calcCost]);

  const allProducts = state.products;

  return (
    <div className="animate-in">
      <Topbar title="Recipes & Cost Calculator" subtitle="Analyze ingredient costs and profit margins" />
      <div className="page-wrapper">

        {/* Overview Cards */}
        <div className="stat-grid mb-5">
          {allProducts.slice(0, 4).map((p, i) => {
            const cost = (recipeMap[p.id] || []).reduce((sum, r) => {
              const ing = state.ingredients.find(ing => ing.id === r.ingredientId);
              return sum + (ing ? ing.costPerUnit * r.qty : 0);
            }, 0);
            const margin = ((p.price - cost) / p.price * 100).toFixed(1);
            const colors = ['amber', 'green', 'blue', 'purple'];
            return (
              <div className={`stat-card ${colors[i]}`} key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(p.id)}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{p.image}</div>
                <div className="stat-label">{p.name}</div>
                <div className="stat-value">{margin}%</div>
                <div className="stat-change up">margin · cost ETB {cost.toFixed(2)}</div>
              </div>
            );
          })}
        </div>

        <div className="dash-grid">
          {/* Product Selector + Recipe */}
          <div>
            <div className="card mb-5">
              <div className="card-title mb-4">
                <ChefHat size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--amber-400)' }} />
                Select Product to Analyze
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allProducts.map(p => (
                  <button
                    key={p.id}
                    className={`btn btn-sm ${selected === p.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setSelected(p.id); setSimPrice(''); }}
                  >
                    {p.image} {p.name}
                  </button>
                ))}
              </div>
            </div>

            {product && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div style={{ fontSize: 32 }}>{product.image}</div>
                    <div className="card-title mt-4">{product.name}</div>
                    <div className="card-subtitle">{product.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--amber-400)' }}>ETB {product.price.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Selling price</div>
                  </div>
                </div>

                <div className="card-title mb-3">Recipe Ingredients</div>
                {recipe.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recipe defined</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Cost/Unit</th>
                        <th>Sub-cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipe.map((r, idx) => {
                        const ing = state.ingredients.find(i => i.id === r.ingredientId);
                        const subCost = ing ? ing.costPerUnit * r.qty : 0;
                        return (
                          <tr key={idx}>
                            <td><strong>{r.name}</strong></td>
                            <td>{r.qty}</td>
                            <td>{r.unit}</td>
                            <td>ETB {ing?.costPerUnit.toFixed(2)}</td>
                            <td style={{ color: 'var(--amber-400)', fontWeight: 600 }}>ETB {subCost.toFixed(3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Cost Breakdown */}
                <div className="divider" />
                <div className="grid-2">
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>INGREDIENT COST</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>ETB {calcCost.toFixed(3)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>PROFIT PER ITEM</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>
                      ETB {(product.price - calcCost).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>PROFIT MARGIN</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber-400)' }}>
                      {(((product.price - calcCost) / product.price) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>MONTHLY PROFIT</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--info)' }}>
                      ETB {((product.price - calcCost) * product.sold).toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Simulator */}
          <div>
            <div className="card mb-5">
              <div className="card-title mb-1">
                <TrendingUp size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--amber-400)' }} />
                Price Simulator
              </div>
              <div className="card-subtitle mb-4">What if you change the selling price?</div>
              <div className="form-group mb-4">
                <label className="form-label">Simulate New Price (ETB)</label>
                <input className="form-input" type="number" step="0.1" placeholder="Enter a price to simulate..." value={simPrice} onChange={e => setSimPrice(e.target.value)} />
              </div>
              {simCost && product && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: simCost.margin >= 30 ? 'rgba(34,197,94,0.1)' : simCost.margin >= 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${simCost.margin >= 30 ? 'rgba(34,197,94,0.3)' : simCost.margin >= 0 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>SIMULATED RESULTS</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>New Selling Price</span>
                      <span style={{ fontWeight: 700 }}>ETB {simCost.price.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>Ingredient Cost</span>
                      <span style={{ fontWeight: 700, color: 'var(--danger)' }}>ETB {calcCost.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>Profit per Item</span>
                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>ETB {(simCost.price - calcCost).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13 }}>Profit Margin</span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: simCost.margin >= 30 ? 'var(--success)' : simCost.margin >= 0 ? 'var(--warning)' : 'var(--danger)' }}>
                        {simCost.margin.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: simCost.margin >= 40 ? 'var(--success)' : simCost.margin >= 20 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
                      {simCost.margin >= 40 ? '✅ Excellent margin!' : simCost.margin >= 20 ? '⚠️ Acceptable margin' : simCost.margin >= 0 ? '⚠️ Very low margin' : '❌ Selling at a loss!'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* All Products Margin Table */}
            <div className="card">
              <div className="card-title mb-4">All Products — Cost Overview</div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Ing. Cost</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map(p => {
                    const cost = (recipeMap[p.id] || []).reduce((sum, r) => {
                      const ing = state.ingredients.find(i => i.id === r.ingredientId);
                      return sum + (ing ? ing.costPerUnit * r.qty : 0);
                    }, 0);
                    const margin = ((p.price - cost) / p.price * 100).toFixed(1);
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(p.id); setSimPrice(''); }}>
                        <td><strong>{p.image} {p.name}</strong></td>
                        <td>ETB {p.price.toFixed(2)}</td>
                        <td>ETB {cost.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${parseFloat(margin) >= 40 ? 'badge-green' : parseFloat(margin) >= 20 ? 'badge-amber' : 'badge-red'}`}>
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
