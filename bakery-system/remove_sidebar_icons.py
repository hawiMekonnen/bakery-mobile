import os

def remove_sidebar_icons(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        c = f.read()

    # Targets to remove inside sidebar-nav
    targets = [
        '<LayoutDashboard className="nav-icon" />\n                ',
        '<LayoutDashboard className="nav-icon" />',
        '<Receipt className="nav-icon" />\n                ',
        '<Receipt className="nav-icon" />',
        '<Smartphone className="nav-icon" />\n                ',
        '<Smartphone className="nav-icon" />',
        '<Building2 className="nav-icon" />\n                ',
        '<Building2 className="nav-icon" />',
        '<Package className="nav-icon" />\n                ',
        '<Package className="nav-icon" />',
        '<UtensilsCrossed className="nav-icon" />\n                ',
        '<UtensilsCrossed className="nav-icon" />',
        '<DatabaseBackup className="nav-icon" />\n                ',
        '<DatabaseBackup className="nav-icon" />',
    ]

    for t in targets:
        c = c.replace(t, '')

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(c)
    print(f"Removed sidebar icons from {os.path.basename(file_path)}")

remove_sidebar_icons(r"C:\Users\user\Desktop\bakery admin\src\App.jsx")
remove_sidebar_icons(r"C:\Users\user\Desktop\bakery system\src\App.jsx")

