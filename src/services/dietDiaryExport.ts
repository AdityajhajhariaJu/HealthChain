import type { MealDiary } from './MealCommandService';
const csv = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
/** Empty nutrient cells mean unknown, never zero; dates and original sources travel with the export. */
export function dietDiaryCsv(diary: MealDiary) {
  const columns = [
    'local_date',
    'occurred_at',
    'time_precision',
    'timezone',
    'meal_name',
    'meal_type',
    'amount',
    'unit',
    'estimated_kcal',
    'protein_g',
    'carbs_g',
    'fat_g',
    'sugar_g',
    'fibre_g',
    'sodium_mg',
    'nutrition_status',
    'nutrition_source',
    'source_id',
    'source_version',
    'original_basis',
    'per_100_nutrients',
    'hunger',
    'fullness',
    'note',
    'reaction',
    'record_id',
  ];
  const rows = Object.entries(diary)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, meals]) =>
      (meals || []).map((meal) => [
        date,
        meal.occurredAt,
        meal.timePrecision,
        meal.timezone,
        meal.name,
        meal.type,
        meal.amountValue ?? meal.portionGrams,
        meal.amountUnit,
        meal.calories,
        meal.protein,
        meal.carbs,
        meal.fat,
        meal.sugar,
        meal.fibre,
        meal.sodium,
        meal.nutritionStatus,
        meal.nutritionSource,
        meal.sourceId,
        meal.sourceVersion,
        meal.originalNutritionBasis,
        meal.per100Nutrients ? JSON.stringify(meal.per100Nutrients) : '',
        meal.hunger,
        meal.fullness,
        meal.note,
        meal.reaction ? JSON.stringify(meal.reaction) : '',
        meal.id,
      ])
    );
  return [columns, ...rows].map((row) => row.map(csv).join(',')).join('\r\n');
}
