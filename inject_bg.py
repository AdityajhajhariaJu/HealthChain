with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("        background: 'transparent',", "        background: 'transparent',\n      }}\n    >\n      {/* Fixed Fullscreen Floral Background */}\n      <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'url(/ava-floral-bg.jpg) center/cover no-repeat', filter: 'contrast(1.05) brightness(1.02)' }} />")
content = content.replace("background: 'transparent',\n      }}\n    >\n      {/* Fixed Fullscreen Floral Background */}\n      <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'url(/ava-floral-bg.jpg) center/cover no-repeat', filter: 'contrast(1.05) brightness(1.02)' }} />\n      }}\n    >", "background: 'transparent',\n      }}\n    >\n      {/* Fixed Fullscreen Floral Background */}\n      <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'url(/ava-floral-bg.jpg) center/cover no-repeat', filter: 'contrast(1.05) brightness(1.02)' }} />")

# I need to be careful with the replacement. Let's do it safely.
