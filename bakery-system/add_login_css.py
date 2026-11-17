import os

login_css = """
/* ==========================================================================
   Login Screen & Card Styles (Professional Centered Admin Card)
   ========================================================================== */
.login-screen {
  min-height: 100vh;
  width: 100%;
  background-color: var(--bg-body, #f8fafc);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  padding: 36px 32px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
}

.login-brand {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo-box {
  width: 48px;
  height: 48px;
  background-color: var(--color-primary, #d97706);
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.25);
}

.login-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary, #0f172a);
  letter-spacing: -0.4px;
  margin: 0 0 6px 0;
}

.login-subtitle {
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  margin: 0;
}

.login-error {
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
  border-radius: var(--radius-sm, 6px);
  padding: 10px 14px;
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: 18px;
  text-align: center;
}
"""

def append_login_css(fp):
    if os.path.exists(fp):
        with open(fp, "r", encoding="utf-8") as f:
            c = f.read()
        if ".login-screen" not in c:
            c = c.rstrip() + "\n" + login_css
            with open(fp, "w", encoding="utf-8") as f:
                f.write(c)
            print(f"Appended login CSS to {fp}")
        else:
            print(f"login-screen already in {fp}")

append_login_css(r"C:\Users\user\Desktop\bakery admin\src\index.css")
append_login_css(r"C:\Users\user\Desktop\bakery system\src\index.css")

