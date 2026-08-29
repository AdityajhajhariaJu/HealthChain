with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Revert all accidental gradient replacements back to transparent
bad_gradient = "background: 'radial-gradient(circle at 10% 0%, #FFF0F5 0%, transparent 60%), radial-gradient(circle at 90% 100%, #FFE4E6 0%, transparent 60%), radial-gradient(circle at 10% 100%, #FFDAB9 0%, transparent 60%), #FFF5F7',"

content = content.replace(bad_gradient, "background: 'transparent',")

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Reverted accidental gradients to transparent")
