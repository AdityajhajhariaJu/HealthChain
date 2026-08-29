import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Theme
content = content.replace("primary: '#0D9488', // Teal 600", "primary: '#F43F5E', // Rose 500")
content = content.replace("light: '#F0FDFA', // Teal 50", "light: '#FFE4E6', // Rose 50")

# 2. Root background
content = content.replace("background: 'transparent',", "background: 'radial-gradient(circle at 10% 0%, #FFF0F5 0%, transparent 60%), radial-gradient(circle at 90% 100%, #FFE4E6 0%, transparent 60%), radial-gradient(circle at 10% 100%, #FFDAB9 0%, transparent 60%), #FFF5F7',")

# 3. Main Glass Container
content = content.replace("background: '#F8FAFC',", "background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',")
content = content.replace("boxShadow: isMobile ? 'none' : '0 8px 32px rgba(0,0,0,0.04)',", "boxShadow: isMobile ? 'none' : '0 24px 64px rgba(244, 63, 94, 0.08)',")
content = content.replace("border: '1px solid rgba(0,0,0,0.04)',", "border: '1px solid rgba(255, 255, 255, 0.7)',")

# 4. Header
content = content.replace("background: '#FFFFFF',", "background: 'transparent',")
content = content.replace("borderBottom: '1px solid #E2E8F0',", "borderBottom: '1px solid rgba(255, 255, 255, 0.4)',")

# 5. Message Bubbles
content = content.replace("background: msg.role === 'user' ? theme.primary : '#FFFFFF',", "background: msg.role === 'user' ? 'linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)' : 'rgba(255, 255, 255, 0.85)', backdropFilter: msg.role === 'user' ? 'none' : 'blur(16px)', WebkitBackdropFilter: msg.role === 'user' ? 'none' : 'blur(16px)',")
content = content.replace("boxShadow: msg.role === 'user' ? '0 4px 12px rgba(234,88,12,0.15)' : '0 4px 12px rgba(0,0,0,0.03)',", "boxShadow: msg.role === 'user' ? '0 12px 32px rgba(244, 63, 94, 0.35)' : '0 16px 40px rgba(244, 63, 94, 0.1)',")
content = content.replace("border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',", "border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.8)',")

# 6. Input Area container
content = content.replace("padding: isMobile ? '10px 14px 76px 14px' : '24px 32px',\n            background: '#FFFFFF',\n            display: 'flex',\n            flexDirection: 'column',\n            alignItems: 'center',\n            borderTop: '1px solid #E2E8F0',", "padding: isMobile ? '10px 14px 76px 14px' : '24px 32px',\n            background: 'transparent',\n            display: 'flex',\n            flexDirection: 'column',\n            alignItems: 'center',\n            borderTop: 'none',")

# 7. Input Textarea/input
content = content.replace("border: '1px solid #E2E8F0',", "border: '1px solid rgba(255, 255, 255, 0.8)',")
content = content.replace("background: '#FFFFFF',\n                fontSize: isMobile ? '14px' : '15px',\n                outline: 'none',\n                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',", "background: 'rgba(255, 255, 255, 0.85)',\n                fontSize: isMobile ? '14px' : '15px',\n                outline: 'none',\n                boxShadow: '0 12px 40px rgba(244, 63, 94, 0.1)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',")


with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AvaHealthBuddy.tsx with immersive design")
