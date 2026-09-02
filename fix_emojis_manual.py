import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "{meal.name === 'Morning Snack'" in line:
        new_lines.append("                  {meal.name === 'Morning Snack' && 'Get energized by grabbing a morning snack 🥜'}\n")
    elif "{meal.name === 'Lunch'" in line:
        new_lines.append("                  {meal.name === 'Lunch' && 'Don\\'t miss lunch 🍱 It\\'s time to get a tasty meal'}\n")
    elif "{meal.name === 'Evening Snack'" in line:
        new_lines.append("                  {meal.name === 'Evening Snack' && 'Refuel your body with a delicious evening snack 🍐'}\n")
    elif "{meal.name === 'Dinner'" in line:
        new_lines.append("                  {meal.name === 'Dinner' && 'An early dinner can help you sleep better 🍽️😴'}\n")
    else:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Fixed emojis manually")
