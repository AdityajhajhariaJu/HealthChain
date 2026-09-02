import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\geminiService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

broken_func_start = "export async function analyzeFoodImage"
start_idx = content.find(broken_func_start)
if start_idx != -1:
    content = content[:start_idx]

new_func = """export async function analyzeFoodImage(base64Image: string, profile: any): Promise<any> {
  const payload = {
    contents: [
      {
        parts: [
          { text: `You are an expert clinical dietician AI. Analyze this image of food.
Identify the food item and estimate its macronutrients based on a standard serving.
Compare it against the user's profile:
- Diet/Conditions: ${profile?.medicalConditions?.join(', ') || 'None'}
- Target Calories: ${profile?.targetCalories || 2000}

Return ONLY a valid JSON object matching this schema:
{
  "foodName": "Name of the food",
  "servingSize": "Estimated serving size (e.g. 1 plate, 1 bowl, 200g)",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "sugar": number,
  "fibre": number,
  "warning": "Warning about glycemic spike, allergens, or non-compliance (or null if it's healthy)",
  "betterAlternative": {
    "name": "Name of a healthier alternative",
    "reason": "Why it is better"
  }
}` },
          { inline_data: { mime_type: "image/jpeg", data: base64Image.split(',')[1] || base64Image } }
        ]
      }
    ],
    generationConfig: { temperature: 0.2 }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini Vision API Error:", err);
    throw new Error('API Error');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response');

  const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}
"""
content += new_func

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed geminiService properly!")
