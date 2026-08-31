import sys

with open('src/features/dietician/Dietician.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

dynamic_logic = '''
  // Dynamic Presets from Meal Plan
  const dynamicPresets = React.useMemo(() => {
    if (!mealPlan || !mealPlan.plan || mealPlan.plan.length === 0) return QUICK_PRESETS;
    
    // Extract up to 6 unique meals from the generated plan
    const meals = [];
    const seen = new Set();
    
    for (const day of mealPlan.plan) {
      if (!day.meals) continue;
      for (const meal of day.meals) {
        if (!seen.has(meal.name)) {
          seen.add(meal.name);
          meals.push({
            name: meal.name,
            portion: meal.portion || '1 serving',
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            emoji: '??',
            type: meal.type || 'Meal'
          });
        }
        if (meals.length >= 6) return meals;
      }
    }
    
    return meals.length > 0 ? meals : QUICK_PRESETS;
  }, [mealPlan]);
'''

if 'const dynamicPresets =' not in content:
    # Insert it right before the return statement of the component
    content = content.replace("  const waterGlasses = hydration[currentDate] || 0;", dynamic_logic + "\n  const waterGlasses = hydration[currentDate] || 0;")

content = content.replace("QUICK_PRESETS.map((preset, pIdx)", "dynamicPresets.map((preset, pIdx)")

# Fix modal height
content = content.replace("maxHeight: '90vh',", "maxHeight: 'calc(100vh - 140px)',")

with open('src/features/dietician/Dietician.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
