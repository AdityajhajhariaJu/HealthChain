import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\geminiService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update analyzeFoodEntry to include emoji and more tokens
target = """        "name": "string (e.g. 'Boiled Eggs (2)')",
        "calories": number,
        "protein": number,
        "fat": number,
        "carbs": number"""

replacement = """        "name": "string (e.g. 'Boiled Eggs (2)')",
        "calories": number,
        "protein": number,
        "fat": number,
        "carbs": number,
        "emoji": "string (1 emoji representing this food)" """

content = content.replace(target, replacement)
content = content.replace("maxOutputTokens: 300", "maxOutputTokens: 1000")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated analyzeFoodEntry in geminiService.ts")
