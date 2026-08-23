import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the inline handler
pattern = r"onComplete=\{\(id: string, transcript: any\) => \{(.*?)\}\}"
replacement = """onComplete={(id: string, transcript: any) => {
                      if (onSpecialistComplete) {
                        onSpecialistComplete(id, transcript);
                      }
                    }}"""
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
