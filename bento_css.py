import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

bento_css = '''
/* ===== BENTO BOX ARCHITECTURE ===== */
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

content += bento_css

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done injecting bento css!')
