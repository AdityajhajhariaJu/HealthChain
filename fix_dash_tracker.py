import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The block to remove starts with {/* 🏥👨‍⚕️🧩 Case Route Tracker 🧩👨‍⚕️🏥 */} and ends with </section>
# Wait, let's just use string replacement for safety, or regex.

pattern = r'\{\s*/\*\s*[^<]*?Case Route Tracker[^<]*?\*/\s*\}.*?</section>'
content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
