import sys
import re

with open('src/features/dietician/Dietician.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the dynamicPresets block
match = re.search(r'(  // Dynamic Presets from Meal Plan\n  const dynamicPresets = React\.useMemo\(\(\) => \{.*?\n  \}, \[mealPlan\]\);\n)', content, re.DOTALL)
if match:
    dynamic_presets_block = match.group(1)
    # Remove it from the current position
    content = content.replace(dynamic_presets_block, '')
    
    # Find a safe place to insert it (after the hooks, before the early return)
    # Let's insert it right before if (!profile)
    insert_point = "  if (!profile) {"
    content = content.replace(insert_point, dynamic_presets_block + "\n" + insert_point)
    
    with open('src/features/dietician/Dietician.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed")
else:
    print("Could not find dynamicPresets block")
