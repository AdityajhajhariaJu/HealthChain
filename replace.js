const fs = require('fs');
const path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dietician/Dietician.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('DieticianDashboardTracker')) {
  const importStr = "import { DieticianDashboardTracker } from './DieticianDashboardTracker';\n";
  content = content.replace("import { ARGroceryLens }", importStr + "import { ARGroceryLens }");

  // Search using simpler substring matching
  const startStr = "Left Col: Macros & Calorie Ring";
  const endStr = "TAB 2: MEAL PLAN";
  
  const startIdx = content.indexOf(startStr);
  const endIdx = content.indexOf(endStr);
  
  if (startIdx !== -1 && endIdx !== -1) {
    // Find the opening div of the grid wrapper which is right before startStr
    const gridStartStr = "<div style={{ display: isMobile ? 'flex' : 'grid'";
    const gridStartIdx = content.lastIndexOf(gridStartStr, startIdx);
    
    // Find the end of the dashboard tab which is right before TAB 2
    const tab2CommentIdx = content.lastIndexOf("{/*", endIdx);

    const replacement = 
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

          ;
    content = content.substring(0, gridStartIdx) + replacement + content.substring(tab2CommentIdx);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully replaced dashboard content.");
  } else {
    console.log("Could not find start/end markers.");
  }
} else {
  console.log("Already integrated.");
}
