import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

meditation_start = -1
meditation_end = -1
for i, line in enumerate(lines):
    if '{/* Our Own Meditation Hub (Hero) */}' in line:
        meditation_start = i
    if '{/* The Mindfulness Library */}' in line and meditation_start != -1:
        meditation_end = i
        break

if meditation_start == -1 or meditation_end == -1:
    print('Could not find meditation block')
    sys.exit(1)

# Extract the meditation block
meditation_block = lines[meditation_start:meditation_end]

# Remove the block from its original position
lines = lines[:meditation_start] + lines[meditation_end:]

# Find where to insert it (below <FatigueModeToggle />)
insert_idx = -1
for i, line in enumerate(lines):
    if '<FatigueModeToggle />' in line:
        insert_idx = i + 1
        break

if insert_idx == -1:
    print('Could not find <FatigueModeToggle />')
    sys.exit(1)

# Insert it
lines = lines[:insert_idx] + ['\n', '          <div style={{ paddingTop: "12px" }}>\n'] + meditation_block + ['          </div>\n'] + lines[insert_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Moved Meditation Hub up')
