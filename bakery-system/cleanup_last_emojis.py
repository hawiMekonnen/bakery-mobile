import os

def cleanup_last_emojis():
    # 1. AnalyticsScreen.js
    p = r"C:\Users\user\Desktop\bakery-mobile\src\screens\AnalyticsScreen.js"
    with open(p, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("'Select Any Day 📅'", "'Select Date'")
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)

    # 2. OrdersScreen.js
    p = r"C:\Users\user\Desktop\bakery-mobile\src\screens\OrdersScreen.js"
    with open(p, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("'Select Any Day 📅'", "'Select Date'")
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)

    # 3. POSScreen.js
    p = r"C:\Users\user\Desktop\bakery-mobile\src\screens\POSScreen.js"
    with open(p, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("emoji: item.emoji || '🥐',", "emoji: item.emoji || '',")
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)

    # 4. ProductsScreen.js
    p = r"C:\Users\user\Desktop\bakery-mobile\src\screens\ProductsScreen.js"
    with open(p, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace("""const EMOJI_OPTIONS = [
  '🥞', '🫓', '🥟', '🥮', '🍯',
  '🥐', '🍞', '🥖', '🥨', '🎂',
  '🍰', '🧁', '🍩', '🍪', '🥧',
  '☕', '🧋', '🫖', '🥪', '🍕'
];""", "const EMOJI_OPTIONS = [];")
    c = c.replace("const [emoji, setEmoji] = useState('🥐');", "const [emoji, setEmoji] = useState('');")
    c = c.replace("setEmoji('🥐');", "setEmoji('');")
    c = c.replace("setEmoji(p.emoji || '🥐');", "setEmoji(p.emoji || '');")
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)

    print("Last emojis removed")

cleanup_last_emojis()

