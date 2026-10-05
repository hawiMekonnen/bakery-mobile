path = r'c:\Users\user\Desktop\bakery-mobile\src\screens\ProfileScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'badge="🟢 Online"' in line or 'badgeColor={COLORS.success}' in line:
        continue
    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("SUCCESS: Online badge removed!")
