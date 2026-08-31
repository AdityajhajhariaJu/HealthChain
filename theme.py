import re

files = [
    'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/TrophyCabinet.tsx',
    'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/ProgressGallery.tsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace backgrounds
    content = content.replace("'#0F172A'", "'#FBF9F6'")
    content = content.replace("'#1E293B'", "'#FFFFFF'")
    content = content.replace("#1E293B", "#FFFFFF")
    content = content.replace("#0F172A", "#FBF9F6")
    
    # Replace borders and box shadows
    content = content.replace("rgba(255, 255, 255, 0.1)", "rgba(0,0,0,0.05)")
    content = content.replace("rgba(255,255,255,0.1)", "rgba(0,0,0,0.05)")
    content = content.replace("rgba(255,255,255,0.05)", "rgba(0,0,0,0.02)")
    
    # Replace text colors
    content = content.replace("'white'", "'#0F172A'")
    content = content.replace("'#FFFFFF'", "'#0F172A'")
    content = content.replace("color: 'rgba(255, 255, 255, 0.7)'", "color: '#64748B'")
    content = content.replace("color: 'rgba(255,255,255,0.7)'", "color: '#64748B'")
    
    # Specific styling fixes
    content = content.replace("color: '#94A3B8'", "color: '#64748B'")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print('Updated both files to light theme')
