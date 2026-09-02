import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'generateGroceryList' not in content:
    content = content.replace("generateNutritionalGuardrails,", "generateNutritionalGuardrails,\n  generateGroceryList,")

# 2. State
if 'const [isGeneratingGrocery' not in content:
    state_vars = """
  const [isGeneratingGrocery, setIsGeneratingGrocery] = useState(false);
"""
    content = content.replace("const [isGeneratingGuardrails, setIsGeneratingGuardrails] = useState(false);", "const [isGeneratingGuardrails, setIsGeneratingGuardrails] = useState(false);\n" + state_vars)

# 3. Handler
if 'const handleGenerateGrocery' not in content:
    handler = """
  const handleGenerateGrocery = async () => {
    if (isGeneratingGrocery) return;
    if (!mealPlan) {
      toast.error('No Meal Plan', 'Please generate a 7-day meal plan first.');
      return;
    }
    setIsGeneratingGrocery(true);
    try {
      const data = await generateGroceryList(mealPlan);
      if (data && data.groceryList) {
        if (isMounted.current) setGroceryList(data.groceryList);
        updateProfileFeatureData('dietician', { groceryList: data.groceryList });
        awardPoints(2, '🛒 Smart List Created', 'lifestyle', `grocery_${Date.now()}`);
        triggerHapticSuccess();
      } else {
        toast.error('Generation Failed', 'Could not extract grocery list. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Failed to connect to AI matrix.');
    } finally {
      if (isMounted.current) setIsGeneratingGrocery(false);
    }
  };
"""
    content = content.replace("const handleGenerateGuardrails = async () => {", handler + "\n  const handleGenerateGuardrails = async () => {")

# 4. Button in JSX
old_btn = """<div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={copyGroceryListText}"""

new_btn = """<div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleGenerateGrocery}
                    disabled={isGeneratingGrocery || !mealPlan}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFF',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: (isGeneratingGrocery || !mealPlan) ? 'not-allowed' : 'pointer',
                      opacity: (isGeneratingGrocery || !mealPlan) ? 0.6 : 1,
                    }}
                  >
                    {isGeneratingGrocery ? (
                      <><Loader2 size={15} className="spin" /> Extracting...</>
                    ) : (
                      <><Sparkles size={15} /> Auto-Generate</>
                    )}
                  </button>
                  <button
                    onClick={copyGroceryListText}"""

content = content.replace(old_btn, new_btn)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dietician.tsx with dynamic grocery list generation")
