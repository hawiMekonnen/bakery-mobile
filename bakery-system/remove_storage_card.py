import sys

path = r'c:\Users\user\Desktop\bakery-mobile\src\screens\ProfileScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '{/* ─── Phone Storage & Persistence Status ─── */}'
start_idx = content.find(start_marker)
if start_idx != -1:
    btn_marker = '</TouchableOpacity>'
    btn_idx = content.find(btn_marker, start_idx)
    end_idx = content.find('</View>', btn_idx) + len('</View>')
    content = content[:start_idx] + content[end_idx:].lstrip('\r\n')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: storageStatusCard removed from ProfileScreen.js')
else:
    print('Error: Marker not found')
