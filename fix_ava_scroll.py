with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "height: isMobile ? '100%' :" in line:
        new_lines.append(line.replace("height: isMobile ? '100%' : 'calc(100dvh - 150px)',", "height: isMobile ? 'auto' : 'calc(100dvh - 150px)',"))
        continue
    if "maxHeight: isMobile ? '100%' :" in line:
        new_lines.append(line.replace("maxHeight: isMobile ? '100%' : 'calc(100dvh - 150px)',", "maxHeight: isMobile ? 'none' : 'calc(100dvh - 150px)',"))
        continue

    # Hide header on mobile since we have the top bar
    if '{/* Header */}' in line:
        new_lines.append(line)
        new_lines.append("        {!isMobile && (\n")
        continue

    if '{/* Chat Area */}' in line:
        # Close the {!isMobile && (
        new_lines.append("        )}\n\n")
        new_lines.append(line)
        continue

    new_lines.append(line)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated AvaHealthBuddy layout and header")
