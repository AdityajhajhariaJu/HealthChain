import sys
import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any difficulty assignment that doesn't have equipment with the full block
content = re.sub(
    r"(difficulty:\s*'[^']+')(?!\s*,\s*equipment)",
    r"\1, equipment: [], is_premium: false, is_featured: true",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added missing properties to all FitnessContent mock objects.')
