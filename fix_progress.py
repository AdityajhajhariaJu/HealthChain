import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/ProgressGallery.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix dark mode colors in Lifestyle Balance section
content = content.replace("color: '#FFF'", "color: '#0F172A'")
content = content.replace("color: '#CBD5E1'", "color: '#475569'")
content = content.replace("background: 'rgba(255,255,255,0.05)'", "background: '#F1F5F9'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated ProgressGallery colors')
