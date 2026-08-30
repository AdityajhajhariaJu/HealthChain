import sys

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("route: '/app/dietician'", "route: '/app/nutrition'")

with open('src/features/dashboard/ImmersiveFeatureFeed.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
