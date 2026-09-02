import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the <MeditationHeroCard item={{ title: 'A Diff Experience' ... /> component call and remove it
content = re.sub(r'<MeditationHeroCard item={{ title: \'A Diff Experience\'.*?getFallbackImage={getFallbackImage} />\n', '', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed 'A Diff Experience' card")
