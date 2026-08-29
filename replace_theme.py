import re

with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Theme Replacement
content = content.replace("'#8B5CF6'", "'#EA580C'")
content = content.replace("light: '#F5F3FF'", "light: '#FFF7ED'")
content = content.replace("text: '#4C1D95'", "text: '#9A3412'")
content = content.replace("bg: '#F8FAFC'", "bg: '#FAFAFA'")

# General purples -> oranges
content = content.replace("'#F8F5FF'", "'#FFF9F0'")
content = content.replace("'#F5F3FF'", "'#FFFFFF'")
content = content.replace("linear-gradient(135deg, #8B5CF6, #3B82F6)", "linear-gradient(135deg, #F97316, #EA580C)")
content = content.replace("linear-gradient(135deg, #FAF5FF 0%, #EDE9FE 100%)", "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)")
content = content.replace("'#DDD6FE'", "'#FED7AA'")
content = content.replace("rgba(139,92,246,0.08)", "rgba(234,88,12,0.08)")
content = content.replace("'#7C3AED'", "'#EA580C'")
content = content.replace("'rgba(139,92,246,0.15)'", "'rgba(234,88,12,0.15)'")
content = content.replace("'#6D28D9'", "'#C2410C'")
content = content.replace("'#4C1D95'", "'#9A3412'")
content = content.replace("'#C4B5FD'", "'#FDBA74'")
content = content.replace("rgba(139, 92, 246, 0.2)", "rgba(234, 88, 12, 0.2)")

# Smoothing
content = content.replace("overflow: 'hidden',", "overflow: 'hidden',\n          border: '1px solid rgba(0,0,0,0.04)',")

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
