import { describe, expect, it } from 'vitest';
import { normalizeFullMealPlan, updateMealServing, applyMealClinicalSwap } from '../dietPlanLifecycle';
import { projectDietGroceries } from '../dietGroceryProjection';

const plan = () => normalizeFullMealPlan({ id: 'plan-1', plan: [
  { day: 1, meals: [{ id: 'breakfast', name: 'Oats', type: 'Breakfast', calories: 300, protein: 12, carbs: 40, fat: 10,
    ingredients: [{ name: 'Oats', amount: 80, unit: 'g' }, { name: 'Milk', amount: 200, unit: 'ml' }],
    steps: ['Cook oats'], prepMinutes: 10 }] },
  { day: 2, meals: [{ id: 'lunch', name: 'Oats again', type: 'Lunch', calories: 300, protein: 12, carbs: 40, fat: 10,
    ingredients: [{ name: 'oats', amount: 40, unit: 'g' }], steps: ['Cook'], prepMinutes: 10 }] },
] });

describe('deterministic Diet shopping projection', () => {
  it('aggregates ingredient amounts, scales servings, and keeps checks by stable key', () => {
    const original = projectDietGroceries(plan());
    expect(original.flatMap(category=>category.items).find((item) => item.ingredient === 'oats')?.amount).toBe(120);
    const checked = original.map(category=>({...category,items:category.items.map(item=>({...item,checked:item.ingredient==='oats'}))}));
    const scaled = projectDietGroceries(updateMealServing(plan(), 1, 'breakfast', 1.5), checked);
    expect(scaled.flatMap(category=>category.items).find((item) => item.ingredient === 'oats')).toMatchObject({ amount: 160, checked: false });
    expect(scaled.flatMap(category=>category.items).find((item) => item.ingredient === 'milk')?.amount).toBe(300);
    expect(projectDietGroceries(plan(),checked).flatMap(category=>category.items).find(item=>item.ingredient==='oats')?.checked).toBe(true);
  });

  it('removes old recipe ingredients after a replacement', () => {
    const replacement = applyMealClinicalSwap(plan(), 1, 'breakfast', { smartReplacement: 'New dish', replacementDetails: 'User selection', biologicalMechanism: 'User note' } as any);
    const items = projectDietGroceries(replacement)[0].items;
    expect(items).toHaveLength(1);
    expect(items[0].amount).toBe(40);
  });

  it('selects meals, scales household portions, subtracts matching stock and rounds packages',()=>{
    const original=projectDietGroceries(plan());
    const packages=original.map(category=>({...category,items:category.items.map(item=>({...item,packageSize:100}))}));
    const items=projectDietGroceries(plan(),packages,{householdSize:3,selectedMeals:['1:breakfast'],pantry:[{id:'stock',name:'oats',amount:100,unit:'g',updatedAt:'2026-09-30T00:00:00Z'},{id:'wrong-unit',name:'milk',amount:1000,unit:'g',updatedAt:'2026-09-30T00:00:00Z'}]}).flatMap(category=>category.items);
    expect(items.find(item=>item.ingredient==='oats')).toMatchObject({amount:140,requiredAmount:240,pantryUsed:100,packages:2});
    expect(items.find(item=>item.ingredient==='milk')).toMatchObject({amount:600,pantryUsed:0});
    expect(projectDietGroceries(plan(),[],{selectedMeals:[]})).toEqual([]);
  });

  it('merges conservative aliases and preserves manual extras when the plan is empty',()=>{
    const draft=plan();draft.days[0].meals[0].ingredients=[{name:'Garbanzo beans',amount:100,unit:'g'}];draft.days[1].meals[0].ingredients=[{name:'chickpeas',amount:80,unit:'g'}];
    expect(projectDietGroceries(draft)[0].items[0]).toMatchObject({ingredient:'chickpeas',amount:180});
    const manual:any=[{category:'Extra',emoji:'',items:[{id:'manual:1',name:'Soap',ingredient:'Soap',amount:1,unit:'piece',manual:true,checked:true}]}];
    expect(projectDietGroceries(null,manual)[0].items[0]).toMatchObject({id:'manual:1',checked:true});
  });
});
