import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add sugar and fibre calculations
calc_find = "const targetFats = profile?.targetFat || 75;"
calc_replace = """const targetFats = profile?.targetFat || 75;
  const targetSugar = profile?.targetSugar || 30;
  const targetFibre = profile?.targetFibre || 25;
  
  const consumedSugar = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.sugar || 0), 0)
    : 0;
    
  const consumedFibre = Array.isArray(foodLogs[currentDate]) 
    ? foodLogs[currentDate].reduce((acc: number, log: any) => acc + (log.fibre || log.fiber || 0), 0)
    : 0;"""

content = content.replace(calc_find, calc_replace)

# Change grid layout to 3x2
grid_find = "gridTemplateColumns: '1fr 1fr',"
grid_replace = "gridTemplateColumns: '1fr 1fr 1fr',"
content = content.replace(grid_find, grid_replace)

# Add Sugar and Fibre circles
circles_find = """<CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" title="Fats" subtitle={${targetFats}g} />
        <CircularProgress value={consumed} max={targetCalories} color="#EF4444" title="Calorie Intake" subtitle={${targetCalories} kcal} />"""

circles_replace = """<CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" title="Fats" subtitle={${targetFats}g} />
        <CircularProgress value={consumedSugar} max={targetSugar} color="#E879F9" title="Sugar" subtitle={${targetSugar}g} />
        <CircularProgress value={consumedFibre} max={targetFibre} color="#8B5CF6" title="Fibre" subtitle={${targetFibre}g} />
        <CircularProgress value={consumed} max={targetCalories} color="#EF4444" title="Calories" subtitle={${targetCalories} kcal} />"""

content = content.replace(circles_find, circles_replace)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Sugar and Fibre, changed to 3x2 grid!")
