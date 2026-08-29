with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

old_css = '''
.bento-card {
  height: 100% !important;
  flex: 1 !important;
  border-radius: 28px !important;
  background: rgba(255, 255, 255, 0.6) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.8) !important;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04) !important;
  margin-bottom: 0 !important; /* Override vertical stacking margins */
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
}

.bento-card:hover {
  transform: translateY(-2px) scale(1.01) !important;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08) !important;
}
'''

new_css = '''
.bento-card {
  height: 100% !important;
  flex: 1 !important;
  border-radius: 28px !important;
  margin-bottom: 0 !important;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.03); /* Base shadow, no important so cards can override */
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease;
  will-change: transform, box-shadow;
}

.bento-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.02);
}

.bento-card:active {
  transform: translateY(0px) scale(0.98);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
}
'''

# Wait, there's another block at the very bottom!
css = css.replace(old_css.strip(), '')

old_micro_css = '''
.bento-card {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease;
  will-change: transform, box-shadow;
}

.bento-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.02) !important;
  border-color: rgba(255, 255, 255, 1) !important;
}

.bento-card:active {
  transform: translateY(0px) scale(0.98);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05) !important;
}
'''

css = css.replace(old_micro_css.strip(), new_css.strip())

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Removed aggressive bento-card overrides")
