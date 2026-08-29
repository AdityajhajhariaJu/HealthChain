files = ['src/components/layout/AppShell.tsx', 'src/services/geminiService.ts']

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Specific Mojibake characters
    content = content.replace('â€œ', '"')
    content = content.replace('â€', '"')
    content = content.replace('â€™', "'")
    content = content.replace('â€˜', "'")
    content = content.replace('â€”', "--")
    content = content.replace('â€“', "-")
    content = content.replace('â€¦', "...")
    content = content.replace('â€', '"')
    
    # Also I found ?o, ??, ?T in BrandPulseBanner earlier.
    # Let's target them precisely
    content = content.replace("?onormal,??", "'normal',")
    content = content.replace("?o{message.quote}??", '"{message.quote}"')
    content = content.replace("You?Tve", "You've")
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
print("Cleaned up specific strings")
