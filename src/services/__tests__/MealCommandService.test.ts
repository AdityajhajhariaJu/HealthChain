// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ records: new Map<string, unknown>(), queueOk: true, profile: {} as any }));
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => state.records.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { state.records.set(key, structuredClone(value)); }),
}));
vi.mock('../supabaseClient', () => ({ supabase: {
  auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'account-a' } } } })) },
} }));
vi.mock('../ProfileEngine', () => ({
  getProfileEngineState: () => ({ activeId: 'profile_1' }), getProfile: () => state.profile,
  saveProfile: vi.fn(async (next: any) => { state.profile = structuredClone(next); }),
}));
vi.mock('../SyncOutbox', () => ({
  enqueueSync: vi.fn(async () => state.queueOk), getPendingObservationIds: vi.fn(async () => new Set()),
}));

import { correctMeal, createMeal, listMealDiary, mealEntryFromAnalysis, migrateLegacyDietMeals, previewLegacyMealMigration, projectMealDiary, removeMeal } from '../MealCommandService';
import {recordDietMealReaction} from '../DietMealReactionService';
import {dietPatternAnswers} from '../dietPatternRecords';
import {dietDiaryCsv} from '../dietDiaryExport';
import { listObservationHistory, retryFailedObservationQueues } from '../HealthObservationService';

describe('shared meal command and diary', () => {
  beforeEach(() => { state.records.clear(); state.queueOk = true; state.profile = { dietFoodLogs: {}, nutrition: { recentLogs: [] } }; localStorage.clear(); localStorage.setItem('hc_account',JSON.stringify({id:'account-a'})); });

  it('preserves actual timing and optional context without inventing nutrients',async()=>{
    const result=await createMeal({localDate:'2026-09-29',captureMethod:'diet_diary',entry:{id:'timed-meal',name:'Restaurant noodles',occurredAt:'2026-09-29T12:30:00Z',timePrecision:'approximate',amountValue:350,amountUnit:'g',hunger:3,fullness:4,note:'Shared meal'}});
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.observation).toMatchObject({occurredAt:'2026-09-29T12:30:00Z',timePrecision:'approximate',payload:{hunger:3,fullness:4,note:'Shared meal',nutritionAssessment:{status:'unknown',nutrients:{calories:null}}}});
    expect((await listMealDiary())['2026-09-29'][0]).toMatchObject({amountValue:350,note:'Shared meal'});
  });
  it('only rescales portions from a matching saved per-100 source and preserves its original snapshot',async()=>{
    const result=await createMeal({localDate:'2026-09-29',captureMethod:'clinical_lens',entry:{id:'catalog-meal',name:'Packaged drink',nutritionSource:'food_catalog',foodType:'packaged',sourceId:'https://world.openfoodfacts.org/product/123',originalNutritionBasis:'per_100ml',originalLabelNutrients:{calories:40,protein:2,carbs:6,fat:1},per100Nutrients:{calories:40,protein:2,carbs:6,fat:1},amountValue:250,amountUnit:'ml',calories:100,protein:5,carbs:15,fat:2.5}});
    expect(result.ok).toBe(true);if(!result.ok)return;
    const corrected=await correctMeal(result.observation.id,result.observation.revision,{amountValue:125,amountUnit:'ml'});
    expect(corrected.ok).toBe(true);if(!corrected.ok||corrected.observation.payload.kind!=='meal')return;
    expect(corrected.observation.payload.nutritionAssessment).toMatchObject({sourceType:'food_catalog',nutrients:{calories:50,protein:2.5},originalNutrients:{calories:40},consumedAmount:{value:125,unit:'ml'}});
    const wrongUnit=await correctMeal(corrected.observation.id,corrected.observation.revision,{amountValue:100,amountUnit:'g'});
    expect(wrongUnit.ok&&wrongUnit.observation.payload.kind==='meal'&&wrongUnit.observation.payload.nutritionAssessment?.status).toBe('unknown');
  });

  it('preserves recipe quantities and records a linked reaction without inventing onset or other symptoms',async()=>{
    const result=await createMeal({localDate:'2026-09-29',captureMethod:'plan_confirmation',entry:{id:'reaction-meal',name:'Rice bowl',calories:500,ingredients:[{name:'Raw rice',amount:80,unit:'g'}],steps:['Cook the rice'],prepMinutes:20}});
    expect(result.ok).toBe(true);if(!result.ok)return;
    const reaction=await recordDietMealReaction(result.observation.id,{reactionType:'bloat',system:'bloating',severity:2,label:'Bloating',emoji:'x',incubationHours:3,loggedAt:new Date().toISOString()});
    expect(reaction.ok).toBe(true);
    const diary=await listMealDiary();expect(diary['2026-09-29'][0]).toMatchObject({ingredients:[{amount:80,unit:'g'}],steps:['Cook the rice'],reaction:{reactionType:'bloat',incubationHours:null}});
    expect(dietPatternAnswers({},await listObservationHistory())['2026-09-29']).toMatchObject({Bloating:true});
    expect(dietPatternAnswers({},await listObservationHistory())['2026-09-29'].Stomach).toBeUndefined();
    const noReaction=await recordDietMealReaction(result.observation.id,{reactionType:'none',system:'bloating',severity:0,label:'No reaction',emoji:'x',incubationHours:null,loggedAt:new Date().toISOString()});expect(noReaction.ok).toBe(true);
    expect(dietPatternAnswers({},await listObservationHistory())['2026-09-29']).toMatchObject({Bloating:false,Stomach:false});
    expect(dietDiaryCsv(diary)).toContain('"2026-09-29"');expect(dietDiaryCsv(diary)).toContain('"recipe"');
  });
  it('rejects future corrections, clears optional context and never rescales from an overridden source',async()=>{
    const meal=await createMeal({localDate:'2026-09-29',captureMethod:'clinical_lens',entry:{id:'source-correction',name:'Drink',calories:50,protein:2,carbs:7,fat:1,nutritionSource:'food_catalog',originalNutritionBasis:'per_100ml',originalLabelNutrients:{calories:50,protein:2,carbs:7,fat:1},per100Nutrients:{calories:50,protein:2,carbs:7,fat:1},amountValue:100,amountUnit:'ml',hunger:3}});expect(meal.ok).toBe(true);if(!meal.ok)return;
    expect(await correctMeal(meal.observation.id,meal.observation.revision,{localDate:'2999-01-01'})).toMatchObject({ok:false,error:'validation'});
    const edit=await correctMeal(meal.observation.id,meal.observation.revision,{nutrients:{calories:80},hunger:null});expect(edit.ok).toBe(true);if(!edit.ok)return;
    expect((await listMealDiary())['2026-09-29'][0].hunger).toBeUndefined();
    const amount=await correctMeal(edit.observation.id,edit.observation.revision,{amountValue:200,amountUnit:'ml'});expect(amount.ok && amount.observation.payload.kind==='meal' && amount.observation.payload.nutritionAssessment).toMatchObject({status:'unknown',nutrients:{calories:null},originalNutrients:{calories:50}});
  });

  it('keeps one identity across retries and hides a deleted meal from all diary views', async () => {
    const command = { localDate: '2026-09-29', captureMethod: 'diet_diary' as const,
      entry: { id: 'user-command-1', name: 'Rice and dal', calories: 390, protein: 14, carbs: 68, fat: 7 } };
    const first = await createMeal(command);
    const repeated = await createMeal(command);
    expect(first.ok && repeated.ok && first.observation.id).toBe(repeated.ok && repeated.observation.id);
    expect((await listMealDiary())['2026-09-29']).toHaveLength(1);
    if (!first.ok) return;
    expect((await listMealDiary())['2026-09-29'][0]).toMatchObject({ id: first.observation.id, calories: 390, nutritionStatus: 'estimated' });
    state.profile.dietFoodLogs['2026-09-29'] = [{ id: 'user-command-1', name: 'Stale profile copy' }];
    expect((await listMealDiary())['2026-09-29']).toHaveLength(1);
    expect(await removeMeal('2026-09-29', first.observation.id)).toMatchObject({ ok: true });
    expect((await listMealDiary())['2026-09-29']).toHaveLength(0);
    expect((await listObservationHistory())[0].deletedAt).not.toBeNull();
  });

  it('creates a new meal only after an explicit deletion, without reviving the tombstone', async () => {
    const command = { localDate: '2026-09-29', captureMethod: 'plan_confirmation' as const,
      entry: { id: 'plan:p1:day:1:meal:m1:date:2026-09-29', name: 'Dal and rice', calories: 420 } };
    const first = await createMeal(command);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(await removeMeal('2026-09-29', first.observation.id)).toMatchObject({ ok: true });
    const relogged = await createMeal(command);
    expect(relogged.ok).toBe(true);
    if (!relogged.ok) return;
    expect(relogged.observation.id).not.toBe(first.observation.id);
    expect((await createMeal(command)).ok).toBe(true);
    expect((await listMealDiary())['2026-09-29']).toHaveLength(1);
    expect((await listObservationHistory()).filter((meal) => meal.deletedAt)).toHaveLength(1);
  });

  it('preserves unknown nutrition and date-only timing for a name-only meal', async () => {
    const result = await createMeal({ localDate: '2026-09-29', captureMethod: 'diet_diary',
      entry: { id: 'preset-1', name: 'Oats and berries', calories: null, protein: null, carbs: null, fat: null } });
    expect(result.ok).toBe(true);
    if (!result.ok || result.observation.payload.kind !== 'meal') return;
    expect(result.observation.timePrecision).toBe('date_only');
    expect(result.observation.occurredAt).toBeNull();
    expect(result.observation.payload.nutritionAssessment).toMatchObject({ status: 'unknown', sourceType: 'none', nutrients: { calories: null } });
  });

  it('does not turn missing item nutrients into zero when aggregating a meal', () => {
    const entry = mealEntryFromAnalysis('Rice and curry', [
      { calories: 200, protein: 4, carbs: 30, fat: 3 },
      { calories: 150, protein: 8, carbs: 10 },
    ]);
    expect(entry).toMatchObject({ calories: 350, protein: 12, carbs: 40, fat: null });
  });

  it('treats observation tombstones as authoritative over legacy projections', () => {
    const legacy = { '2026-09-29': [{ id: 'old-1', name: 'Old meal' }] };
    const observation = { id: 'canonical-1', sourceRecordId: 'old-1', payload: { kind: 'meal' }, deletedAt: '2026-09-29T12:00:00Z' } as any;
    expect(projectMealDiary(legacy, [observation])['2026-09-29']).toEqual([]);
  });

  it('reports a locally saved meal whose sync could not be queued', async () => {
    state.queueOk = false;
    const result = await createMeal({ localDate: '2026-09-29', captureMethod: 'quick_nutrition',
      entry: { id: 'quick-1', name: 'Lentil soup', calories: 240 } });
    expect(result).toMatchObject({ ok: true, sync: 'queue_failed' });
    expect((await listMealDiary())['2026-09-29']).toHaveLength(1);
    state.queueOk = true;
    expect(await retryFailedObservationQueues()).toEqual({ retried: 1, remaining: 0 });
  });

  it('migrates a stable older meal once and retains its profile copy for rollback', async () => {
    state.profile.dietFoodLogs['2026-09-28'] = [{ id: 'old-2', name: 'Curd rice', calories: 280, loggedAt: '2026-09-28T13:00:00Z' }];
    state.profile.nutrition.recentLogs = [{ id: 'old-2', meal: 'Curd rice', date: '2026-09-28' }];
    expect(await migrateLegacyDietMeals()).toMatchObject({ imported: 1, failed: 0 });
    expect(await migrateLegacyDietMeals()).toMatchObject({ imported: 0, failed: 0 });
    expect((await listMealDiary())['2026-09-28']).toHaveLength(1);
    expect(state.profile.dietFoodLogs['2026-09-28']).toHaveLength(1);
    expect((await listObservationHistory())[0].payload).toMatchObject({ nutritionAssessment: { sourceType: 'legacy' } });
  });

  it('quarantines duplicate legacy identities rather than merging same-day occasions', () => {
    const preview = previewLegacyMealMigration({ '2026-09-28': [
      { id: 'duplicate', name: 'Breakfast' }, { id: 'duplicate', name: 'Second breakfast' },
    ] }, []);
    expect(preview.ready).toHaveLength(0);
    expect(preview.skipped.map((item) => item.reason)).toEqual(['ambiguous_id', 'ambiguous_id']);
  });

  it('snapshots planned food as estimated intake and accepts a revision-checked correction', async () => {
    const command = { localDate: '2026-09-29', captureMethod: 'plan_confirmation' as const,
      entry: { id: 'plan:p1:day:1:meal:m1:date:2026-09-29', name: 'Dal and rice', type: 'Lunch',
        calories: 420, protein: 18, carbs: 60, fat: 11, sourceId: 'p1:1:m1', sourceVersion: 'rev-1',
        ingredients: [{ name: 'Dal', verified: false }, { name: 'Rice', verified: false }] } };
    const first = await createMeal(command);
    expect(first.ok).toBe(true);
    if (!first.ok || first.observation.payload.kind !== 'meal') return;
    expect(first.observation.payload.nutritionAssessment).toMatchObject({ status: 'estimated', sourceType: 'recipe', sourceId: 'p1:1:m1' });
    expect(first.observation.payload.ingredients).toMatchObject([{ name: 'Dal', status: 'unverified' }, { name: 'Rice', status: 'unverified' }]);
    expect((await createMeal(command)).ok).toBe(true);
    const corrected = await correctMeal(first.observation.id, first.observation.revision, { name: 'Dal, rice and curd', nutrients: { calories: 520 }, portionGrams: 380 });
    expect(corrected.ok).toBe(true);
    expect(await correctMeal(first.observation.id, first.observation.revision, { name: 'Stale' })).toMatchObject({ ok: false, error: 'revision_conflict' });
    expect((await listMealDiary())['2026-09-29'][0]).toMatchObject({ name: 'Dal, rice and curd', calories: 520, portionGrams: 380, revision: 2 });
  });

  it('keeps printed serving basis separate from per-100g and eaten-portion nutrients', async () => {
    const saved = await createMeal({ localDate: '2026-09-29', captureMethod: 'clinical_lens', entry: {
      id: 'label-1', name: 'Packaged cereal', foodType: 'packaged', portionGrams: 60,
      calories: 240, protein: 6, carbs: 42, fat: 3,
      originalNutritionBasis: 'per_serving', originalServingGrams: 30,
      originalLabelNutrients: { calories: 120, protein: 3, carbs: 21, fat: 1.5 },
      per100Nutrients: { calories: 400, protein: 10, carbs: 70, fat: 5 },
    } });
    expect(saved.ok).toBe(true);
    if (!saved.ok || saved.observation.payload.kind !== 'meal') return;
    expect(saved.observation.payload.nutritionAssessment).toMatchObject({
      status: 'label_transcribed_unverified', sourceType: 'package_label',
      originalBasis: { kind: 'per_serving', metricServing: { value: 30, unit: 'g' } },
      originalNutrients: { calories: 120 }, per100Nutrients: { calories: 400 },
      consumedAmount: { value: 60, unit: 'g' }, nutrients: { calories: 240 },
    });
  });
});
