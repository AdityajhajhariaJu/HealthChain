import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'DieticianDashboardTracker' not in content:
    content = content.replace('import { ARGroceryLens }', "import { DieticianDashboardTracker } from './DieticianDashboardTracker';\nimport { ARGroceryLens }")
    
    start_str = "Left Col: Macros & Calorie Ring"
    end_str = "TAB 2: 7-DAY MEAL PLAN"
    
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    if start_idx != -1 and end_idx != -1:
        grid_start_str = "<div style={{ display: isMobile ? 'flex' : 'grid'"
        grid_start_idx = content.rfind(grid_start_str, 0, start_idx)
        
        tab2_comment_idx = content.rfind("{/*", 0, end_idx)
        
        replacement = """
              <DieticianDashboardTracker 
                profile={profile} 
                foodLogs={foodLogs} 
                currentDate={currentDate}
                onLogMeal={(mealName) => { setSelectedMealType(mealName); setIsLoggingFood(true); }}
                onSnap={() => setShowARLens(true)}
                onOpenSettings={() => {}}
                onOpenGallery={() => {}}
              />
            </motion.div>
          )}

          """
        content = content[:grid_start_idx] + replacement + content[tab2_comment_idx:]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success")
    else:
        print("Markers not found")
else:
    print("Already integrated")
