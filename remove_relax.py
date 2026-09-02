import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_array = """                {[
                  { title: 'Deep Sleep', img: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80' },
                  { title: 'Deep Focus', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80' },
                  { title: 'Pure Relax', img: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&q=80' },
                  { title: 'Morning Energy', img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80' }
                ].map((item, i) => ("""

new_array = """                {[
                  { title: 'Deep Sleep', img: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80' },
                  { title: 'Deep Focus', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80' }
                ].map((item, i) => ("""

content = content.replace(old_array, new_array)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed Pure Relax and Morning Energy")
