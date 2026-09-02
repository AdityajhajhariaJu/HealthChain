import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """      try {
        const plan = await generateMealPlan(profile, 7);
        if (plan) {
          if (isMounted.current) {
            setMealPlan(plan);
            awardPoints(3, '🏆 Generated 7-Day Precision Meal Plan', 'lifestyle', `diet_plan_${Date.now()}`);
            triggerHapticSuccess();
            recordTrialUsage('dietician');
          }
          addEvent('diet', 'dietician', 'Generated 7-Day Meal Plan', { plan });
        }
      }"""

new_logic = """      try {
        const plan = await generateMealPlan(profile, 7);
        if (plan && plan.plan && plan.plan.length > 0) {
          if (isMounted.current) {
            setMealPlan(plan);
            awardPoints(3, '🏆 Generated 7-Day Precision Meal Plan', 'lifestyle', `diet_plan_${Date.now()}`);
            triggerHapticSuccess();
            recordTrialUsage('dietician');
          }
          addEvent('diet', 'dietician', 'Generated 7-Day Meal Plan', { plan });
        } else {
          toast.error('Generation Failed', 'Received an incomplete meal plan. Please try again.');
        }
      }"""

# Since emoji might differ, let's use regex
content = re.sub(
    r"const plan = await generateMealPlan\(profile, 7\);\s*if\s*\(plan\)\s*\{\s*if\s*\(isMounted\.current\)\s*\{.*?addEvent.*?\}\s*\}",
    r"const plan = await generateMealPlan(profile, 7);\n        if (plan && plan.plan && plan.plan.length > 0) {\n          if (isMounted.current) {\n            setMealPlan(plan);\n            awardPoints(3, '🏆 Generated 7-Day Precision Meal Plan', 'lifestyle', `diet_plan_${Date.now()}`);\n            triggerHapticSuccess();\n            recordTrialUsage('dietician');\n          }\n          addEvent('diet', 'dietician', 'Generated 7-Day Meal Plan', { plan });\n        } else {\n          toast.error('Generation Failed', 'Failed to parse the meal plan from AI. Please try again.');\n        }",
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dietician.tsx failure handling")
