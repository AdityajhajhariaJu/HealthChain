import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to close the extra div after the 6 CircularProgress components.
# Let's find the closing div of the grid.
old_end = """<CircularProgress value={consumed} max={targetCalories} color="#EF4444" trackColor="#FEE2E2" title="Calories" subtitle={`${targetCalories} kcal`} />
        </div>

      {/* 3. Quick Actions */}"""

new_end = """<CircularProgress value={consumed} max={targetCalories} color="#EF4444" trackColor="#FEE2E2" title="Calories" subtitle={`${targetCalories} kcal`} />
          </div>
        </div>

      {/* 3. Quick Actions */}"""

if old_end in content:
    content = content.replace(old_end, new_end)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Closed wrapper div successfully")
else:
    print("Could not find the target to close the div")
