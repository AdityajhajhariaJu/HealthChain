with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

micro_css = '''
/* =========================================
   Point 3: Premium Micro-Interactions 
   ========================================= */
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

.btn {
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
}

.btn:active {
  transform: scale(0.94) !important;
}

/* Floating Tab Bar Hover */
.mobile-tab-bar a {
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s ease;
}

.mobile-tab-bar a:active {
  transform: scale(0.85);
}
'''

if 'Point 3: Premium Micro-Interactions' not in css:
    css += '\n' + micro_css
    with open('src/index.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Micro-interactions added.")
else:
    print("Already added.")
