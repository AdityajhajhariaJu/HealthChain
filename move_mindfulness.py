import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

mindfulness_start = -1
mindfulness_end = -1
for i, line in enumerate(lines):
    if '{/* The Mindfulness Library */}' in line:
        mindfulness_start = i
    if '{/* Our Own Music Library */}' in line and mindfulness_start != -1:
        mindfulness_end = i
        break

if mindfulness_start == -1 or mindfulness_end == -1:
    print('Could not find mindfulness block')
    sys.exit(1)

# Extract the mindfulness block
mindfulness_block = lines[mindfulness_start:mindfulness_end]

# Remove the block from its original position
lines = lines[:mindfulness_start] + lines[mindfulness_end:]

# Find where to insert it (below the previously moved Meditation Hub)
insert_idx = -1
for i, line in enumerate(lines):
    if '<MeditationHeroCard item={{ title: \'A Diff Experience\'' in line:
        insert_idx = i + 3
        break

if insert_idx == -1:
    print('Could not find Meditation Hub insertion point')
    sys.exit(1)

# Insert it
lines = lines[:insert_idx] + ['\n'] + mindfulness_block + lines[insert_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Moved Mindfulness Library up')
