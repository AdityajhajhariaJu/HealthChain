import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the array
content = re.sub(r'\{\[\s*\{\s*title:\s*\'Deep Sleep\'.*?\{\s*title:\s*\'Morning Energy\'.*?\}\s*\]\.map', r"""{[
                  { title: 'Deep Sleep', img: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80' },
                  { title: 'Deep Focus', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80' }
                ].map""", content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed Pure Relax and Morning Energy")
