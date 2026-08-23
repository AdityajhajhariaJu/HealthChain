import re

with open("src/features/dietician/Dietician.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the save effect
save_func = """  // Save state to local storage when it changes
  useEffect(() => {
    try {
      const data = { profile, foodLogs, hydration, mealPlan, advice };
      updateProfileFeatureData('dietician', data);
      
      if (profile) localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_diet_profile'), JSON.stringify(profile));
      localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_food_logs'), JSON.stringify(foodLogs));
      localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_hydration'), JSON.stringify(hydration));
      if (mealPlan) localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_meal_plan'), JSON.stringify(mealPlan));
      if (advice) localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_diet_advice'), advice);
    } catch(e) {}
  }, [profile, foodLogs, hydration, mealPlan, advice]);"""

content = re.sub(r"  // Save state to local storage when it changes\n  useEffect\(\(\) => \{\n    if \(profile\).*?\}, \[advice\]\);", save_func, content, flags=re.DOTALL)

with open("src/features/dietician/Dietician.tsx", "w", encoding="utf-8") as f:
    f.write(content)
