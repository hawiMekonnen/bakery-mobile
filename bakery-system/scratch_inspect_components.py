import os, re

comp_dir = r'c:\Users\user\Desktop\bakery-mobile\src\components'
for root, dirs, files in os.walk(comp_dir):
    for f in files:
        if f.endswith('.js'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8') as fp:
                lines = fp.readlines()
            for i, l in enumerate(lines):
                if re.search(r'\$\s*\{[^}]*(?:price|total|amount|cost|revenue|sales|subtotal|tax|discount|change|due|balance|cash|paid|sum)[^}]*\}', l, re.I) or re.search(r'>\s*\$', l) or re.search(r'[\'"]\s*\$\s*[\'"]', l) or re.search(r'\$\s*\{[a-zA-Z0-9_\.]+\.toFixed', l):
                    print(f"{f} L{i+1}: {l.strip()}")

