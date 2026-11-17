import os, re

def update_login():
    fp = r"C:\Users\user\Desktop\bakery-mobile\src\screens\LoginScreen.js"
    with open(fp, "r", encoding="utf-8") as f:
        c = f.read()

    c = c.replace(
        """        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🥐</Text>
          </View>
          <Text style={styles.logoTitle}>Bakery</Text>
          <Text style={styles.logoSubtitle}>Artisan Bakery Management</Text>
        </View>""",
        """        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>B</Text>
          </View>
          <Text style={styles.logoTitle}>Bakery POS</Text>
          <Text style={styles.logoSubtitle}>Point of Sale Terminal</Text>
        </View>"""
    )

    c = c.replace(
        "<Text style={styles.cardTitle}>Welcome Back</Text>",
        "<Text style={styles.cardTitle}>Terminal Sign In</Text>"
    )
    c = c.replace(
        "<Text style={styles.cardSubtitle}>Sign in to manage your bakery</Text>",
        "<Text style={styles.cardSubtitle}>Enter operator credentials to begin shift</Text>"
    )

    c = c.replace(
        """  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.md,
  },
  logoEmoji: {
    fontSize: 38,
  },""",
        """  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.md,
  },
  logoLetter: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-medium',
  },"""
    )

    c = re.sub(r'borderRadius:\s*20,', 'borderRadius: 8,', c)

    with open(fp, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated LoginScreen")

update_login()

