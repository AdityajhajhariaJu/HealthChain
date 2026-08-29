with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

old_css = '''  .mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: calc(var(--bottom-tab-height) + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.06);
    display: flex;
    justify-content: space-around;
  }'''

new_css = '''  .mobile-tab-bar {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 12px) + 12px);
    left: 16px;
    right: 16px;
    width: calc(100% - 32px);
    height: var(--bottom-tab-height);
    padding-bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 24px;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
    display: flex;
    justify-content: space-around;
  }'''

content = content.replace(old_css, new_css)
with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated .mobile-tab-bar in index.css")
