import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\services\geminiService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

guardrail_fn = """
export async function generateNutritionalGuardrails(profile: any): Promise<any> {
  const dietaryRelevantConditions = (profile?.medicalConditions || []).filter((c: string) => {
    const l = (c || '').toLowerCase();
    return l.includes('diabet') || l.includes('gerd') || l.includes('acid') || l.includes('celiac') || 
           l.includes('gluten') || l.includes('gout') || l.includes('hypertens') || l.includes('renal') || 
           l.includes('kidney') || l.includes('ibs') || l.includes('crohn') || l.includes('colitis') || 
           l.includes('cholesterol') || l.includes('liver') || l.includes('thyroid');
  });

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert clinical dietician AI. Generate 4 personalized nutritional guardrails based on the user's medical profile.
Medical Conditions: ${dietaryRelevantConditions.length > 0 ? dietaryRelevantConditions.join(', ') : 'Healthy, no specific conditions'}
Age: ${profile?.demographics?.age || 'Adult'}
Gender: ${profile?.demographics?.gender || 'Unknown'}

Rules:
1. Output ONLY JSON.
2. Provide exactly 4 guardrail objects.
3. Tailor the guardrails strictly to their conditions (e.g., if Diabetic, focus on Glycemic index. If Hypertensive, focus on Sodium/DASH. If healthy, focus on general longevity, microbiome, and inflammation).
4. Format:
{
  "guardrails": [
    {
      "icon": "Zap" | "Heart" | "ShieldCheck" | "Layers" | "Activity" | "Droplet" | "Brain" | "Flame",
      "color": "orange" | "blue" | "green" | "purple" | "red",
      "title": "Short Medical Title (e.g. Cardio-Renal DASH Balance)",
      "target": "Quantifiable Target (e.g. Sodium < 2,000mg Daily)",
      "description": "2-3 sentences explaining the clinical rationale and mechanism of action.",
      "keyNutrients": "Comma separated list of 3-4 specific nutrients or foods."
    }
  ]
}`
          }
        ]
      }
    ],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1200 }
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'dietician_guardrails' },
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
    console.error('Guardrails generation error:', err);
    return null;
  }
}
"""

if "export async function generateNutritionalGuardrails" not in content:
    # Insert it before generateMealPlan
    content = content.replace("export async function generateMealPlan", guardrail_fn + "\nexport async function generateMealPlan")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added generateNutritionalGuardrails to geminiService.ts")
else:
    print("Already exists")
