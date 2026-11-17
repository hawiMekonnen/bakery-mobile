import os
import re

mobile_src = r'c:\Users\user\Desktop\bakery-mobile\src'
admin_src = r'c:\Users\user\Desktop\bakery admin\src'

def scan_dir(src_path, label):
    print(f"================ Scanning {label} ================")
    for root, dirs, files in os.walk(src_path):
        for f in files:
            if not f.endswith(('.js', '.jsx')):
                continue
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                lines = fp.readlines()
            matches = []
            for i, line in enumerate(lines):
                # match:
                # `$...${...}` or `$$` or `$` preceding numbers or `$` in JSX text
                # or CURRENCY constants or references to '$'
                if re.search(r'\$\s*\{[^}]*(?:price|total|amount|cost|revenue|sales|subtotal|tax|discount|change|due|balance|cash|paid|sum)[^}]*\}', line, re.I):
                    matches.append((i + 1, line.strip()))
                elif re.search(r'>\s*\$\s*\{', line):
                    matches.append((i + 1, line.strip()))
                elif re.search(r'[\'"`]\s*\$\s*[\'"`]', line):
                    matches.append((i + 1, line.strip()))
                elif re.search(r'>\s*\$\s*<', line):
                    matches.append((i + 1, line.strip()))
                elif re.search(r'currency\s*:\s*[\'"`]\$', line, re.I):
                    matches.append((i + 1, line.strip()))
                elif re.search(r'\$\s*\{[a-zA-Z0-9_\.]+\.toFixed', line):
                    matches.append((i + 1, line.strip()))
                elif re.search(r'[\'"`]\$\s*\{', line):
                    # like `$${item.price.toFixed(2)}`
                    matches.append((i + 1, line.strip()))

            if matches:
                print(f"File: {f} ({len(matches)} matches)")
                for lno, text in matches[:10]:
                    print(f"  Line {lno}: {text}")
                if len(matches) > 10:
                    print(f"  ... and {len(matches) - 10} more matches")

scan_dir(mobile_src, "Bakery Mobile")
scan_dir(admin_src, "Bakery Admin")

