import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "justifyItems: 'center'\n      }}>"
end_str = "</div>\n\n      {/* 3. Quick Actions */}"

if start_str in content and end_str in content:
    s_idx = content.find(start_str) + len(start_str)
    e_idx = content.find(end_str)
    
    new_block = """
        <CircularProgress value={consumedProtein} max={targetProtein} color="#10B981" title="Protein" subtitle={`${targetProtein}g`} />
        <CircularProgress value={consumedCarbs} max={targetCarbs} color="#3B82F6" title="Carbs" subtitle={`${targetCarbs}g`} />
        <CircularProgress value={consumedFats} max={targetFats} color="#F59E0B" title="Fats" subtitle={`${targetFats}g`} />
        <CircularProgress value={consumedSugar} max={targetSugar} color="#E879F9" title="Sugar" subtitle={`${targetSugar}g`} />
        <CircularProgress value={consumedFibre} max={targetFibre} color="#8B5CF6" title="Fibre" subtitle={`${targetFibre}g`} />
        <CircularProgress value={consumed} max={targetCalories} color="#EF4444" title="Calories" subtitle={`${targetCalories} kcal`} />
      """
      
    content = content[:s_idx] + new_block + content[e_idx:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Not found")
