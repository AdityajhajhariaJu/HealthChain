import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make it a 3 column grid to achieve the vertical compression
content = content.replace(
    "gridTemplateColumns: '1fr 1fr'",
    "gridTemplateColumns: 'repeat(3, 1fr)'"
)

# Reorder the elements to group macros on top row and others on bottom row
# Currently: Protein, Carbs, Sugar, Fibre, Fats, Calories
# We want: Protein, Carbs, Fats, Sugar, Fibre, Calories

# First, extract the elements
old_grid = r"""<CircularProgress value={consumedProtein} max={targetProtein} color="#10B981" trackColor="#D1FAE5" title="Protein" subtitle={`${targetProtein}g`} />
            <CircularProgress value={consumedCarbs} max={targetCarbs} color="#3B82F6" trackColor="#DBEAFE" title="Carbs" subtitle={`${targetCarbs}g`} />
            <CircularProgress value={consumedSugar} max={targetSugar} color="#E879F9" trackColor="#FAE8FF" title="Sugar" subtitle={`${targetSugar}g`} />
            <CircularProgress value={consumedFibre} max={targetFibre} color="#8B5CF6" trackColor="#EDE9FE" title="Fibre" subtitle={`${targetFibre}g`} />
            <CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" trackColor="#FEF3C7" title="Fats" subtitle={`${targetFats}g`} />
            <CircularProgress value={consumed} max={targetCalories} color="#EF4444" trackColor="#FEE2E2" title="Calories" subtitle={`${targetCalories} kcal`} />"""

new_grid = r"""<CircularProgress value={consumedProtein} max={targetProtein} color="#10B981" trackColor="#D1FAE5" title="Protein" subtitle={`${targetProtein}g`} />
            <CircularProgress value={consumedCarbs} max={targetCarbs} color="#3B82F6" trackColor="#DBEAFE" title="Carbs" subtitle={`${targetCarbs}g`} />
            <CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" trackColor="#FEF3C7" title="Fats" subtitle={`${targetFats}g`} />
            <CircularProgress value={consumedSugar} max={targetSugar} color="#E879F9" trackColor="#FAE8FF" title="Sugar" subtitle={`${targetSugar}g`} />
            <CircularProgress value={consumedFibre} max={targetFibre} color="#8B5CF6" trackColor="#EDE9FE" title="Fibre" subtitle={`${targetFibre}g`} />
            <CircularProgress value={consumed} max={targetCalories} color="#EF4444" trackColor="#FEE2E2" title="Calories" subtitle={`${targetCalories} kcal`} />"""

content = content.replace(old_grid, new_grid)

# Adjust padding and gap for 3 columns (need smaller width gap so it doesn't overflow)
content = content.replace(
    "gap: '20px 24px',",
    "gap: '20px 8px',"
)
content = content.replace(
    "padding: '20px 24px',",
    "padding: '24px 16px',"
)

# Also scale down CircularProgress slightly to ensure it fits safely on all mobile screens (from 80px to 64px, radius 28 to 22)
def shrink_progress(match):
    block = match.group(0)
    block = block.replace("width: '80px', height: '80px'", "width: '64px', height: '64px'")
    block = block.replace('width="80" height="80"', 'width="64" height="64"')
    block = block.replace('cx="40" cy="40"', 'cx="32" cy="32"')
    block = block.replace('fontSize: \'18px\'', 'fontSize: \'14px\'')
    block = block.replace('radius = 28', 'radius = 22')
    return block

content = re.sub(r"const CircularProgress = .*?return \(.*?\);\n    };", shrink_progress, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Grid converted to 3 columns and scaled for ~40% vertical compression.")
