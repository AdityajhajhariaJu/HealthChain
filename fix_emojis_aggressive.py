import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace those entire lines
content = re.sub(r"\{meal\.name === 'Morning Snack' && 'Get energized by grabbing a morning snack.*?\}", "{meal.name === 'Morning Snack' && 'Get energized by grabbing a morning snack 🥜'}", content)
content = re.sub(r"\{meal\.name === 'Lunch' && 'Don\\'t miss lunch.*?\}", "{meal.name === 'Lunch' && 'Don\\'t miss lunch 🍱 It\\'s time to get a tasty meal'}", content)
content = re.sub(r"\{meal\.name === 'Evening Snack' && 'Refuel your body with a delicious evening snack.*?\}", "{meal.name === 'Evening Snack' && 'Refuel your body with a delicious evening snack 🍐'}", content)
content = re.sub(r"\{meal\.name === 'Dinner' && 'An early dinner can help you sleep better.*?\}", "{meal.name === 'Dinner' && 'An early dinner can help you sleep better 🍽️😴'}", content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed emojis aggressively")
