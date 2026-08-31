import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/ImmersiveFeatureFeed.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fixed width and height with full width
content = re.sub(
    r"width:\s*'180px',\s*minWidth:\s*'180px',\s*height:\s*'240px',\s*scrollSnapAlign:\s*'center',",
    "width: '100%', height: '320px',",
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed card dimensions')
