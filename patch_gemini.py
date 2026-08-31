import sys

with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Cuisine Preference: . DO NOT SUGGEST WESTERN FOOD IF THIS IS NOT WESTERN.", "Cuisine Preference: . DO NOT SUGGEST WESTERN FOOD IF THIS IS NOT WESTERN.")
content = content.replace("Cuisine Preference: . DO NOT SUGGEST WESTERN FOOD IF THIS IS NOT WESTERN.Strictly follow the ''", "Strictly follow the '' cuisine preference. Generate authentic, delicious dishes.")

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
