import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\geminiService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_fetch = """  const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });"""

good_fetch = """  const response = await fetchWithTimeout(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'food_vision' },
    body: JSON.stringify(payload)
  });"""

content = content.replace(bad_fetch, good_fetch)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced with fetchWithTimeout")
