with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if skip:
        if 'backface-visibility' in line:
            skip = False
            continue
        if 'align-items: center;' in line and 'backface' not in lines[i+1]:
             # wait, it might be different
             pass
        continue

    if '.mobile-tab-bar {' in line:
        skip = True
        new_lines.append('''  .mobile-tab-bar {
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
    align-items: center;
    z-index: 900;
  }
''')
        # We need to correctly skip the old block.
        # Let's write a smarter loop
