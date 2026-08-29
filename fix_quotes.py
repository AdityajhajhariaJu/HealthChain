import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Mojibake and smart quotes
replacements = {
    'â€œ': '"',
    'â€': '"',
    'â€™': "'",
    '“': '"',
    '”': '"',
    '’': "'",
    '?o': '"',
    '??': '"',
    '?T': "'",
}

# Actually, the file might contain raw bytes that were decoded incorrectly.
# Let's replace the actual strings that appear in the file.
# The user's screenshot has â€œ...â€.
# Let's just regex search for any weird characters in the BrandPulseBanner block and fix them.

old_brand_pulse_1 = "You?Tve explained your symptoms to five different doctors. Your labs come back ?onormal,?? but you still feel terrible."
new_brand_pulse_1 = "You've explained your symptoms to five different doctors. Your labs come back 'normal', but you still feel terrible."
content = content.replace(old_brand_pulse_1, new_brand_pulse_1)

old_brand_pulse_2 = "<strong>?o{message.quote}??</strong>"
new_brand_pulse_2 = "<strong>\"{message.quote}\"</strong>"
content = content.replace(old_brand_pulse_2, new_brand_pulse_2)

# Also cover the case where the python script reading earlier might have seen ?o but it's actually â€œ in the file.
content = content.replace('â€œ', '"')
content = content.replace('â€', '"')
content = content.replace('â€™', "'")
content = content.replace('â€', '"') # Catch-all for remaining broken quotes

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced Mojibake in AppShell.tsx")
