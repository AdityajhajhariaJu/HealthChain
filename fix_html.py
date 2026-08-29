import os

filepath = 'index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make it edge to edge
if "viewport-fit=cover" not in content:
    content = content.replace('content="width=device-width, initial-scale=1.0"', 'content="width=device-width, initial-scale=1.0, viewport-fit=cover"')

# Apple status bar tag
apple_tag = '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />'
if apple_tag not in content:
    content = content.replace('</head>', f'  {apple_tag}\n</head>')

# Ensure theme-color is properly set as an ID so we can modify it
if 'name="theme-color"' in content and 'id="theme-color-meta"' not in content:
    content = content.replace('<meta name="theme-color" content="#ffffff" />', '<meta name="theme-color" content="#F0FDFA" id="theme-color-meta" />')
    content = content.replace('<meta name="theme-color" content="#0F172A" />', '<meta name="theme-color" content="#F0FDFA" id="theme-color-meta" />')
    
# In case it didn't replace because of exact formatting, let's just use regex
import re
content = re.sub(r'<meta name="theme-color".*?>', '<meta name="theme-color" content="#F0FDFA" id="theme-color-meta" />', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html")
