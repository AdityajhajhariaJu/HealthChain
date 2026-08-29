with open('src/features/jarvis/JarvisInvestigator.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'JarvisCoreOrange' in line:
        for j in range(max(0, i-10), min(len(lines), i+15)):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
