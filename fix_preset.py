import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace preset.type with selectedMealType in handleAddPreset
old_block = """      updatedLogs[currentDate].push({
        name: preset.name,
        portion: preset.portion,
        calories: preset.calories,
        protein: preset.protein,
        carbs: preset.carbs,
        fat: preset.fat,
        emoji: preset.emoji,
        type: preset.type,
        id: Date.now() + Math.random(),
      });"""

new_block = """      updatedLogs[currentDate].push({
        name: preset.name,
        portion: preset.portion,
        calories: preset.calories,
        protein: preset.protein,
        carbs: preset.carbs,
        fat: preset.fat,
        emoji: preset.emoji,
        type: selectedMealType,
        id: Date.now() + Math.random(),
      });"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed handleAddPreset!")
else:
    print("Could not find the exact block to replace.")
