import { fetchWithTimeout } from './transport';
import { API_URL } from './transport';
import { parseModelJson } from '../modelJson';
import { normalizeFoodLocation } from '../../../shared/food-location';
import { supabase } from '../supabaseClient';

export async function analyzeFoodEntry(text: string): Promise<any> {
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are a food-log assistant. Estimate a nutritional breakdown from the user's description and return strictly valid JSON.
Entry: "${text}"

Rules:
1. Output ONLY JSON, nothing else.
2. Make it explicit in clinical_insight that values are estimates and portions or package labels should be checked. Do not infer glucose response, medical suitability, or treatment effects.
3. Format:
{
  "items": [
    {
      "name": "string (e.g. 'Boiled Eggs (2)')",
      "calories": number,
      "protein": number,
      "fat": number,
      "carbs": number
    }
  ],
  "total": { "calories": number, "protein": number, "fat": number, "carbs": number },
  "clinical_insight": "string (A short, 1-sentence insight based on the food logged)"
}`,
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1000 },
  };

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'dietician_food_log' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson<any>(text, null);
    }
  } catch (err) {
    console.error('Food analysis error:');
    return null;
  }
}

export async function generateDieticianAdvice(profile: any): Promise<string> {
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are a food-planning assistant. Provide exactly 2 sentences of general, culturally relevant meal-planning guidance.
Conditions: ${(profile.medicalConditions || []).join(', ') || 'None'}
Cuisine Preference: . DO NOT SUGGEST WESTERN FOOD IF THIS IS NOT WESTERN.${profile.cuisine || 'Not specified'}
Goal: ${profile.targetCalories || 2000} kcal/day

Rules:
1. Do not use quotes or introductory text. Just the 2 sentences.
2. Respect the cuisine preference. Do not claim to treat a condition or give a disease-specific target; say that medical nutrition needs should be confirmed with a qualified dietitian or clinician.
3. Be practical and culturally relevant.`,
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 150 },
  };
  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'dietician_advice' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.candidates?.[0]) return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error('Dietician advice error:');
  }
  return 'Keep meals practical and varied using foods you already enjoy. Confirm condition-specific nutrition targets with a qualified dietitian or clinician.';
}

export async function generateNutritionalGuardrails(profile: any): Promise<any> {
  const dietaryRelevantConditions = (profile?.medicalConditions || []).filter((c: string) => {
    const l = (c || '').toLowerCase();
    return (
      l.includes('diabet') ||
      l.includes('gerd') ||
      l.includes('acid') ||
      l.includes('celiac') ||
      l.includes('gluten') ||
      l.includes('gout') ||
      l.includes('hypertens') ||
      l.includes('renal') ||
      l.includes('kidney') ||
      l.includes('ibs') ||
      l.includes('crohn') ||
      l.includes('colitis') ||
      l.includes('cholesterol') ||
      l.includes('liver') ||
      l.includes('thyroid')
    );
  });

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are a food-planning assistant. Generate 4 cautious meal-planning considerations based on the user's saved profile.
Medical Conditions: ${(profile?.medicalConditions || []).length > 0 ? profile.medicalConditions.join(', ') : 'No conditions recorded; health status is unknown'}
Food-planning context keywords: ${dietaryRelevantConditions.length > 0 ? dietaryRelevantConditions.join(', ') : 'None identified; do not infer absence of illness'}
Age: ${profile?.demographics?.age || 'Adult'}
Gender: ${profile?.demographics?.gender || 'Unknown'}

Rules:
1. Output ONLY JSON.
2. Provide exactly 4 guardrail objects.
3. Do not prescribe numeric medical targets or imply treatment. When a condition may affect nutrition, frame the item as something to confirm with a qualified dietitian or clinician.
4. Format:
{
  "guardrails": [
    {
      "icon": "Zap" | "Heart" | "ShieldCheck" | "Layers" | "Activity" | "Droplet" | "Brain" | "Flame",
      "color": "orange" | "blue" | "green" | "purple" | "red",
      "title": "Short planning title",
      "target": "A neutral observation or discussion prompt",
      "description": "1-2 sentences explaining what to verify without giving treatment advice.",
      "keyNutrients": "Comma separated list of 3-4 specific nutrients or foods."
    }
  ]
}`,
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1200 },
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
      return parseModelJson<any>(text, null);
    }
  } catch (err) {
    console.error('Guardrails generation error:');
    return null;
  }
}

export async function generateGroceryList(mealPlan: any): Promise<any> {
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are a grocery-planning assistant. Generate a structured shopping list based EXACTLY on this example meal plan.
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
}`,
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2000 },
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
      return parseModelJson<any>(text, null);
    }
  } catch (err) {
    console.error('Grocery generation error:');
    return null;
  }
}

const dietPlanPayload = (profile: any) => {
  const location = normalizeFoodLocation(profile);
  return {
    dietPlanRequest: {
      age: Number(profile?.age),
      gender: profile?.gender,
      pregnancyStatus: profile?.pregnancyStatus,
      targetCalories: Number(profile?.targetCalories),
      cuisine: profile?.cuisine || 'Any',
      mealSchedule: profile?.mealSchedule || '3 Meals + 1 Snack',
      goal: profile?.goal,
      ...(location.countryCode ? location : {}),
      ...(profile?.planningPreferences ? { preferences: profile.planningPreferences } : {}),
    },
  };
};

const pendingPlanKey = async (profileKey: string): Promise<string> => {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId || !profileKey) throw new Error('diet_plan_recovery_unavailable');
  return `hc_diet_plan_pending_v1:${userId}:${profileKey}`;
};

const planFingerprint = async (profile: any): Promise<string> => {
  if (!globalThis.crypto?.subtle) throw new Error('diet_plan_recovery_unavailable');
  const bytes = new TextEncoder().encode(JSON.stringify(dietPlanPayload(profile)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function hasPendingDietPlanRequest(
  profile: any,
  profileKey: string
): Promise<boolean> {
  try {
    const key = await pendingPlanKey(profileKey);
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    return Boolean(stored?.id && stored?.fingerprint === (await planFingerprint(profile)));
  } catch {
    return false;
  }
}

export async function clearPendingDietPlanRequest(profileKey: string): Promise<void> {
  localStorage.removeItem(await pendingPlanKey(profileKey));
}

export async function generateMealPlan(
  profile: any,
  days: number = 7,
  profileKey = 'default'
): Promise<any> {
  if (days !== 7) return null;
  const payload = dietPlanPayload(profile);
  const storageKey = await pendingPlanKey(profileKey);
  const fingerprint = await planFingerprint(profile);
  let previous: { id?: string; fingerprint?: string } | null = null;
  try {
    previous = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {
    throw new Error('diet_plan_recovery_unavailable');
  }
  const requestId =
    previous?.fingerprint === fingerprint && previous.id
      ? previous.id
      : globalThis.crypto?.randomUUID?.();
  if (!requestId) throw new Error('diet_plan_recovery_unavailable');
  try {
    localStorage.setItem(storageKey, JSON.stringify({ id: requestId, fingerprint }));
    if (JSON.parse(localStorage.getItem(storageKey) || 'null')?.id !== requestId)
      throw new Error('diet_plan_recovery_unavailable');
  } catch {
    throw new Error('diet_plan_recovery_unavailable');
  }

  try {
    const res = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HC-Operation': 'dietician_meal_plan',
        'X-HC-Request-Id': requestId,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      if (res.status === 402) throw new Error('diet_plan_quota_exceeded');
      if (res.status === 400 || res.status === 422) throw new Error('diet_plan_unsupported_setup');
      if (res.status === 409) {
        const failure = await res.json().catch(() => ({}));
        if (failure.reason === 'request_failed') {
          await clearPendingDietPlanRequest(profileKey);
          // Resume a failed request left by an earlier page/version in this click.
          // With the key cleared the next call cannot recurse on that old ID again.
          if (previous?.id === requestId) return generateMealPlan(profile, days, profileKey);
          throw new Error('diet_plan_retry_ready');
        }
        throw new Error('diet_plan_in_progress');
      }
      const failure = await res.json().catch(() => ({}));
      if (failure.requestState === 'failed') {
        await clearPendingDietPlanRequest(profileKey);
        if (failure.reason === 'meal_plan_truncated' || failure.reason === 'invalid_meal_plan')
          throw new Error('diet_plan_incomplete');
        throw new Error('diet_plan_generation_failed');
      }
      throw new Error('diet_plan_not_received');
    }
    const data = await res.json();
    if (data.candidates?.[0]) {
      const text = data.candidates[0].content.parts[0].text;
      return parseModelJson<any>(text, null);
    }
  } catch (err) {
    console.error('Meal plan generation error:');
    if (err instanceof Error && err.message === 'QUOTA_EXCEEDED')
      throw new Error('diet_plan_quota_exceeded');
    if (err instanceof Error && err.message.startsWith('diet_plan_')) throw err;
    // Keep the recovery key for uncertain transport outcomes: the server may
    // already have saved the plan. Never disguise a network failure as bad meals.
    throw new Error('diet_plan_not_received');
  }
}

// â”€â”€â”€ 3D BODY MAP / FABLE EXPERIMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
