import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleAddFood silent failure
old_code = """      try {
        const result = await analyzeFoodEntry(foodInput);
        if (result && result.items) {
          const updatedLogs = { ...foodLogs };"""

new_code = """      try {
        const result = await analyzeFoodEntry(foodInput);
        if (result && result.items) {
          const updatedLogs = { ...foodLogs };"""

# We need to find the end of that if statement. Let's do a targeted regex or just replace the specific `console.error('Failed to analyze food:', err);` area to ensure there's a fallback. Wait, actually, let's just add an else block before the catch block.

# Find this exact block:
#           addEvent('diet', 'dietician', `Logged Food: ${result.items.map((i: any) => i.name).join(', ')}`, {
#             items: result.items,
#             type: selectedMealType,
#           });
#         console.error('Failed to analyze food:', err); # Wait, I saw a missing brace or something earlier!

# Let's inspect handleAddFood again.
