import re

files = ['src/components/layout/AppShell.tsx', 'src/services/geminiService.ts']

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Common Mojibake mappings when Windows-1252 is read as UTF-8
    content = content.replace('â€œ', '"')
    content = content.replace('â€ ', '"')
    content = content.replace('â€™', "'")
    content = content.replace('â€˜', "'")
    content = content.replace('â€”', "--")
    content = content.replace('â€“', "-")
    content = content.replace('â€¦', "...")
    content = content.replace('â€', '"')
    content = content.replace('œ', '') # Sometimes part of â€œ
    content = content.replace('?', "'") # A lot of these ?T etc. were already manually fixed or might be just ?, but let's be careful.
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
print("Cleaned up AppShell and geminiService")
