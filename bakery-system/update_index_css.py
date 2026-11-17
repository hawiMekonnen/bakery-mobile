with open(r'c:\Users\user\Desktop\bakery admin\src\index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix .nav-link focus behavior
old_nav_link = """.nav-link:hover {
  background-color: var(--bg-subtle);
  color: var(--text-primary);
}

.nav-link.active {
  background-color: var(--color-primary-light);
  color: var(--color-primary-active);
  font-weight: 600;
  border-color: rgba(217, 119, 6, 0.2);
}"""

new_nav_link = """.nav-link:hover {
  background-color: var(--bg-subtle);
  color: var(--text-primary);
}

.nav-link:focus {
  outline: none;
}

.nav-link:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: -2px;
}

.nav-link.active {
  background-color: var(--color-primary-light);
  color: var(--color-primary-active);
  font-weight: 600;
  border-color: rgba(217, 119, 6, 0.25);
}"""

css = css.replace(old_nav_link, new_nav_link)

extra_css = """
/* Enterprise Terminal Status Badges */
.badge-active {
  background-color: #dcfce7;
  color: #15803d;
  border-color: #bbf7d0;
}
.badge-pending {
  background-color: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}
.badge-suspended {
  background-color: #ffedd5;
  color: #c2410c;
  border-color: #fed7aa;
}
.badge-blocked {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
.badge-unlinked {
  background-color: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}
.badge-pending-delivery {
  background-color: #fef9c3;
  color: #854d0e;
  border: 1px dashed #ca8a04;
}
.badge-due-soon {
  background-color: #fef3c7;
  color: #b45309;
  border-color: #fde68a;
}
.badge-past-due {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

/* Date Preset Buttons */
.date-preset-btn {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.date-preset-btn:hover {
  background-color: var(--bg-subtle);
  color: var(--text-primary);
}
.date-preset-btn.active {
  background-color: var(--color-primary-light);
  color: var(--color-primary-active);
  border-color: var(--color-primary);
  font-weight: 600;
}

/* Totals Bar */
.totals-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}
.totals-item {
  display: flex;
  flex-direction: column;
}
.totals-item-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
}
.totals-item-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Bulk Toolbar */
.bulk-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}

/* Details Drawer */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.45);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}
.drawer-content {
  width: 100%;
  max-width: 520px;
  height: 100%;
  background-color: var(--bg-surface);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow-y: auto;
}
"""

if '/* Enterprise Terminal Status Badges */' not in css:
    css += extra_css

with open(r'c:\Users\user\Desktop\bakery admin\src\index.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open(r'c:\Users\user\Desktop\bakery system\src\index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated index.css successfully!")

