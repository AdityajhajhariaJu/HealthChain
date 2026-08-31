import sys

files = [
    'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/TrophyCabinet.tsx',
    'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/ProgressGallery.tsx'
]

def replace_colors(content):
    # We will use temporary tokens to avoid overlap
    
    # 1. Backgrounds
    # '#0F172A' (Dark theme BG) -> '#FBF9F6' (Light Creme)
    content = content.replace("'#0F172A'", "'__CREME_BG__'")
    content = content.replace("#0F172A", "__CREME_BG__")
    
    # '#1E293B' (Dark theme Card) -> '#FFFFFF' (Light Card)
    content = content.replace("'#1E293B'", "'__WHITE_CARD__'")
    content = content.replace("#1E293B", "__WHITE_CARD__")
    
    # 2. Text Colors
    # 'white' or '#FFFFFF' (Text) -> '#0F172A' (Dark Slate)
    content = content.replace("'white'", "'__DARK_TEXT__'")
    content = content.replace("'#FFFFFF'", "'__DARK_TEXT__'")
    content = content.replace("#FFFFFF", "__DARK_TEXT__")
    
    # 3. Secondary Text Colors
    # 'rgba(255, 255, 255, 0.7)' -> '#64748B' (Slate)
    content = content.replace("rgba(255, 255, 255, 0.7)", "__SLATE_TEXT__")
    content = content.replace("rgba(255,255,255,0.7)", "__SLATE_TEXT__")
    
    # 4. Borders
    # 'rgba(255, 255, 255, 0.1)' -> 'rgba(0,0,0,0.05)'
    content = content.replace("rgba(255, 255, 255, 0.1)", "__LIGHT_BORDER__")
    content = content.replace("rgba(255,255,255,0.1)", "__LIGHT_BORDER__")
    
    # 'rgba(255,255,255,0.05)' -> 'rgba(0,0,0,0.02)'
    content = content.replace("rgba(255,255,255,0.05)", "__LIGHT_BORDER_FAINT__")

    # Apply tokens
    content = content.replace("__CREME_BG__", "#FBF9F6")
    content = content.replace("__WHITE_CARD__", "#FFFFFF")
    content = content.replace("__DARK_TEXT__", "#0F172A")
    content = content.replace("__SLATE_TEXT__", "#64748B")
    content = content.replace("__LIGHT_BORDER__", "rgba(0,0,0,0.05)")
    content = content.replace("__LIGHT_BORDER_FAINT__", "rgba(0,0,0,0.02)")
    
    return content

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = replace_colors(content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

print('Updated both files safely')
