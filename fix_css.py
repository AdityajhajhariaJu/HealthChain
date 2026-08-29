import os

filepath = 'src/index.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Update .mobile-top-bar
old_top_bar = """  .mobile-top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: rgba(255, 255, 255, 0.45); /* Theme agnostic frosted glass */
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 100;
  }"""

new_top_bar = """  .mobile-top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: calc(64px + env(safe-area-inset-top, 0px));
    padding-top: env(safe-area-inset-top, 0px);
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.25) 100%);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    border-bottom: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 16px;
    padding-right: 16px;
    z-index: 100;
  }"""
content = content.replace(old_top_bar, new_top_bar)

# Update padding for .app-shell__content
old_content = """  .app-shell__content {
    padding-top: 64px;
    padding-bottom: 80px;
  }"""

new_content = """  .app-shell__content {
    padding-top: calc(64px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }"""
content = content.replace(old_content, new_content)

# Make sure body has a neutral background that doesn't ruin the edge-to-edge
body_old = "background-color: #F0FDFA;"
body_new = "background-color: #F0FDFA; /* Default fallback, safe areas will bleed properly now */"
content = content.replace(body_old, body_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.css for edge-to-edge")
