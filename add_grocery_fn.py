import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\geminiService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

grocery_fn = """
export async function generateGroceryList(mealPlan: any): Promise<any> {
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert clinical dietician AI. Generate a structured grocery shopping list based EXACTLY on this 7-day meal plan. 
Do not include generic items unless they are required for the meals. Group them into logical categories.

Meal Plan:
${JSON.stringify(mealPlan)}

Rules:
1. Output ONLY JSON.
2. Format exactly as follows:
{
  "groceryList": [
    {
      "category": "Fresh Produce",
      "emoji": "🥬",
      "items": [
        { "id": "g1", "name": "Baby Spinach (500g)", "checked": false },
        { "id": "g2", "name": "Tomatoes (1kg)", "checked": false }
      ]
    },
    {
      "category": "Proteins & Dairy",
      "emoji": "🥚",
      "items": []
    }
    // Add other logical categories (Grains, Spices, Pantry, etc.)
  ]
}`
          }
        ]
      }
    ],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2000 }
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'dietician_grocery' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      const match = text.match(/\{[\\s\\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  } catch (err) {
    console.error('Grocery generation error:', err);
    return null;
  }
}
"""

if "export async function generateGroceryList" not in content:
    content = content.replace("export async function generateMealPlan", grocery_fn + "\nexport async function generateMealPlan")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added generateGroceryList to geminiService.ts")
else:
    print("Already exists")
