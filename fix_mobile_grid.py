with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make the grid always 12 columns
content = content.replace("gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)'", "gridTemplateColumns: 'repeat(12, 1fr)'")

# Hero is full width
content = content.replace("gridColumn: isMobile ? '1 / -1' : 'span 8'", "gridColumn: isMobile ? 'span 12' : 'span 8'")
content = content.replace("gridColumn: isMobile ? '1 / -1' : 'span 4'", "gridColumn: isMobile ? 'span 12' : 'span 4'")
content = content.replace("gridColumn: '1 / -1'", "gridColumn: 'span 12'")

# Now, the two smaller bento cards: Momentum and Health Record
# They are currently span 6 on desktop. On mobile, let's also make them span 6 so they sit side by side!
content = content.replace("gridColumn: isMobile ? '1 / -1' : 'span 6'", "gridColumn: isMobile ? 'span 6' : 'span 6'")

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated grid for mobile")
