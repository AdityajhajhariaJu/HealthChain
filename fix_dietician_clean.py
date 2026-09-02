import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Also fix the empty Snap Gallery button and emojis in grocery list
content = content.replace("onOpenGallery={() => {}}", "onOpenGallery={() => setShowARLens(true)}")
content = content.replace("`dY>' HealthChain", "`🛒 HealthChain")
content = content.replace("? '~`' : '~?'", "? '[x]' : '[ ]'")
content = content.replace("? '✅' : '⭕'", "? '[x]' : '[ ]'")

# Fix handleGeneratePlan
old_block = r"      const plan = await generateMealPlan\(profile, 7\);\s*if \(plan\) \{\s*if \(isMounted\.current\) \{\s*setMealPlan\(plan\);\s*awardPoints[^\n]+\n\s*triggerHapticSuccess\(\);\s*recordTrialUsage\('dietician'\);\s*\}\s*addEvent[^\n]+\n\s*\}"

match = re.search(old_block, content, re.MULTILINE)
if match:
    # Instead of replacing everything, we just add the else branch
    new_block = match.group(0) + """ else {
        toast.error('Generation Failed', 'Failed to parse the meal plan from AI. Please try again.');
      }"""
    content = content[:match.start()] + new_block + content[match.end():]
else:
    print("WARNING: handleGeneratePlan block not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dietician.tsx")
