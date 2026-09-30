export function validProductBarcode(code) {
  if (typeof code !== 'string' || !/^(?:\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = [...code].map(Number),
    check = digits.pop();
  const total = digits
    .reverse()
    .reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (total % 10)) % 10 === check;
}
const number = (value, max) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
export function normalizeFoodProduct(data, code) {
  if (
    !validProductBarcode(code) ||
    !data?.product ||
    (data.product.code && data.product.code !== code)
  )
    return null;
  const p = data.product,
    n = p.nutriments || {};
  const kcal = number(n['energy-kcal_100g'], 1000);
  const energyKj = number(n['energy-kj_100g'], 4184);
  const nutrients = {
    calories: kcal ?? (energyKj === null ? null : Math.round((energyKj / 4.184) * 100) / 100),
    protein: number(n.proteins_100g, 100),
    carbs: number(n.carbohydrates_100g, 100),
    fat: number(n.fat_100g, 100),
    sugar: number(n.sugars_100g, 100),
    fibre: number(n.fiber_100g, 100),
    sodium: number(n.sodium_100g, 100) === null ? null : Math.round(n.sodium_100g * 1000),
  };
  const issues = Array.isArray(p.data_quality_errors_tags)
    ? p.data_quality_errors_tags.filter((item) => typeof item === 'string').slice(0, 12)
    : [];
  if (
    nutrients.sugar !== null &&
    nutrients.carbs !== null &&
    nutrients.sugar > nutrients.carbs + 0.5
  )
    issues.push('Sugar exceeds carbohydrate. Check the printed label.');
  if (
    nutrients.protein !== null &&
    nutrients.carbs !== null &&
    nutrients.fat !== null &&
    nutrients.protein + nutrients.carbs + nutrients.fat > 105
  )
    issues.push('Nutrient totals are inconsistent. Check the printed label.');
  return {
    code,
    name: String(p.product_name || p.product_name_en || `Product ${code}`).slice(0, 240),
    brands: String(p.brands || '').slice(0, 160),
    per100: nutrients,
    basis:
      p.product_quantity_unit === 'ml'
        ? 'unknown'
        : p.nutrition_data_per === '100g'
          ? 'per_100g'
          : 'unknown',
    sourceId: `https://world.openfoodfacts.org/product/${code}`,
    sourceVersion: String(p.last_modified_t || ''),
    issues,
    ingredients: String(p.ingredients_text || '').slice(0, 4000),
    allergens: String(p.allergens || '').slice(0, 1000),
    license: 'Open Food Facts · Open Database License (ODbL)',
    retrievedAt: new Date().toISOString(),
  };
}
export function productPortion(per100, amount) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 5000)
    throw new Error('Enter the amount consumed, up to 5,000 g or ml.');
  return Object.fromEntries(
    Object.entries(per100).map(([key, value]) => [
      key,
      typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.round(((value * amount) / 100) * 100) / 100
        : null,
    ])
  );
}
