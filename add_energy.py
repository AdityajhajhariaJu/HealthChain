import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the array to add "Happy High Energy" back
old_array = """                {[
                  { title: 'Deep Sleep', img: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80' },
                  { title: 'Deep Focus', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80' }
                ].map((item, i) => ("""

new_array = """                {[
                  { title: 'Deep Sleep', img: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80' },
                  { title: 'Deep Focus', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80' },
                  { title: 'Happy High Energy', img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80' }
                ].map((item, i) => ("""

content = content.replace(old_array, new_array)

# Add logic for subtitle and description
old_subtitle = """                                  item.title === 'Deep Focus' ? 'Binaural beats for intense concentration' :
                                  item.title === 'Pure Relax' ? 'Unwind your nervous system' :
                                  'Start your day with clarity',"""

new_subtitle = """                                  item.title === 'Deep Focus' ? 'Binaural beats for intense concentration' :
                                  'Start your day with clarity',"""

content = content.replace(old_subtitle, new_subtitle)

old_desc = """                                     item.title === 'Deep Focus' ? 'Designed for deep work. Isochronic tones stimulate gamma brainwaves, helping you achieve flow state faster and maintain it longer without burnout.' :
                                     item.title === 'Pure Relax' ? 'A quick reset for your nervous system. Combines gentle breathwork cues with ambient swells to lower cortisol and release physical tension.' :
                                     'An energizing morning protocol. Uses upbeat frequencies and positive visualization to prime your mind and body for peak performance today.',"""

new_desc = """                                     item.title === 'Deep Focus' ? 'Designed for deep work. Isochronic tones stimulate gamma brainwaves, helping you achieve flow state faster and maintain it longer without burnout.' :
                                     'An energizing morning protocol. Uses upbeat frequencies and positive visualization to prime your mind and body for peak performance today.',"""

content = content.replace(old_desc, new_desc)

old_dur = """                        duration_minutes: item.title === 'Deep Sleep' ? 45 : item.title === 'Deep Focus' ? 60 : item.title === 'Pure Relax' ? 15 : 10,"""
new_dur = """                        duration_minutes: item.title === 'Deep Sleep' ? 45 : item.title === 'Deep Focus' ? 60 : 15,"""
content = content.replace(old_dur, new_dur)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CaseDashboard.tsx for Happy High Energy")
