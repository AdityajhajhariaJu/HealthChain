import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all sections related to audio/meditation
matches = re.findall(r'<section>.*?</section>', content, flags=re.DOTALL)
for i, m in enumerate(matches):
    if 'Audio' in m or 'Meditation' in m or 'Soundscapes' in m or 'mood' in m:
        print(f"--- Section {i} ---")
        # print first 15 lines of section
        print("\n".join(m.split("\n")[:15]))
        print("...")

