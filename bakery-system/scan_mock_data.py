import os
import re

dirs = [
    r'c:\Users\user\Desktop\bakery admin\src',
    r'c:\Users\user\Desktop\bakery admin\server.js',
    r'c:\Users\user\Desktop\bakery admin\storage.js',
    r'c:\Users\user\Desktop\bakery-mobile\src',
    r'c:\Users\user\Desktop\bakery-mobile\App.js',
]

terms = ['mock', 'fake', 'dummy', 'sample', 'placeholder', 'demo', 'lorem', 'faker', 'INITIAL_PRODUCTS', 'INITIAL_INVENTORY']
results = {term: [] for term in terms}

def scan_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for idx, line in enumerate(f, 1):
                for term in terms:
                    if re.search(r'\b' + re.escape(term) + r'\b', line, re.IGNORECASE):
                        results[term].append(f'{os.path.basename(filepath)}:{idx}: {line.strip()[:100]}')
    except Exception as e:
        pass

for root_item in dirs:
    if os.path.isfile(root_item):
        scan_file(root_item)
    elif os.path.isdir(root_item):
        for root, _, files in os.walk(root_item):
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.html')):
                    scan_file(os.path.join(root, file))

for term, occurrences in results.items():
    print(f'Term "{term}": {len(occurrences)} occurrences found')
    for occ in occurrences[:5]:
        print(f'   {occ}')
    if len(occurrences) > 5:
        print(f'   ... ({len(occurrences)-5} more)')

