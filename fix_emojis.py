import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """            updatedLogs[currentDate].push({
              ...item,
              type: selectedMealType,
              id: Date.now() + Math.random(),
            });"""

replacement = """            updatedLogs[currentDate].push({
              emoji: item.emoji || '🍽️',
              ...item,
              type: selectedMealType,
              id: Date.now() + Math.random(),
            });"""

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added fallback emoji for logged foods")
