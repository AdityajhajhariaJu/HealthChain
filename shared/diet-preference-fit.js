/** A conservative quality gate for obvious preference failures; not an allergen certification. */
export function validateDietPreferenceFit(plan, preferences, schedule) {
  const errors = [];
  const expected = schedule
    ? schedule === '5 Small Meals'
      ? 5
      : schedule === '3 Meals'
        ? 3
        : 4
    : null;
  for (const day of plan?.plan || plan?.days || []) {
    if (expected && day.meals?.length !== expected)
      errors.push('Meal count does not match the schedule.');
    const slots=schedule==='5 Small Meals'?['breakfast','morning snack','lunch','evening snack','dinner']:schedule==='3 Meals'?['breakfast','lunch','dinner']:['breakfast','lunch','snack','dinner'];
    if(expected && slots.some(slot=>(day.meals||[]).filter(meal=>String(meal.type||'').trim().toLowerCase()===slot).length!==1))errors.push('Meal slots do not match the schedule.');
    for (const meal of day.meals || []) {
      if (!preferences) continue;
      if (meal.prepMinutes > preferences.maxPrepMinutes)
        errors.push('Preparation exceeds the chosen time.');
      for (const ingredient of meal.ingredients || []) {
        const name = String(ingredient.name || '').toLowerCase();
        if(preferences.equipment.includes('No cooking') && /\b(rice|pasta|noodles|lentils|chickpeas|beans|eggs?)\b/.test(name) && !/\b(cooked|precooked|canned|tinned|boiled|steamed|roasted|baked|ready[- ]to[- ]eat|bread|cakes|paper|flakes|sprouts)\b/.test(name))errors.push('No-cooking meals need explicitly ready-to-eat staple ingredients.');
        const veganName = name
          .replace(
            /\b(?:plant[- ]based|vegan) (?:milk|cream|butter|cheese|yogurt|yoghurt)\b/g,
            'plant alternative'
          )
          .replace(
            /\b(?:coconut|almond|oat|soy|soya) (?:milk|cream|yogurt|yoghurt)\b/g,
            'plant alternative'
          )
          .replace(/\b(?:peanut|almond|cashew|nut|cocoa) butter\b/g, 'plant spread');
        if (
          preferences.dietaryPattern !== 'Any' &&
          /\b(beef|pork|chicken|turkey|lamb|mutton|fish|salmon|tuna|shrimp|prawn|seafood|bacon|ham|gelatin|gelatine|anchovy|anchovies|sardine|duck|goat|venison|crab|lobster|oyster|mussel|clam|squid|octopus|mackerel|cod|haddock|trout)\b/.test(
            name
          )
        )
          errors.push('Animal ingredient conflicts with the dietary pattern.');
        if (
          preferences.dietaryPattern === 'Vegan' &&
          /\b(egg|eggs|yogurt|yoghurt|curd|paneer|cheese|butter|ghee|honey|whey|cream|milk)\b/.test(
            veganName
          )
        )
          errors.push('Ingredient conflicts with vegan preferences.');
        if (
          preferences.dislikes.some(
            (dislike) => name === dislike.toLowerCase() || name.includes(dislike.toLowerCase())
          )
        )
          errors.push('An avoided food appears in ingredients.');
      }
      if (
        preferences.equipment.includes('No cooking') &&
        /\b(cook|boil|fry|bake|roast|simmer|steam|grill|saute|sauté|microwave)\b/i.test(
          (meal.steps || []).join(' ')
        )
      )
        errors.push('Recipe needs cooking despite the no-cooking preference.');
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
