import React, { useEffect, useState } from 'react';
import {
  normalizeDietPreferences,
  locationMealIdeas,
  dietMealSlots,
} from '../../../shared/diet-preferences';
import {
  getDietEveryday,
  saveDietEveryday,
  favoriteFromMeal,
  reusedMealEntry,
  effectiveFoodLocation,
  planMealKey,
  type DietEveryday,
} from '../../services/dietEveryday';
import { normalizeFullMealPlan, type FullMealPlan } from '../../services/dietPlanLifecycle';
import { createMeal } from '../../services/MealCommandService';
import { getProfile, getProfileKey } from '../../services/ProfileEngine';
import { DietPracticalPreferences } from './DietPracticalPreferences';
import { emptyMealDetails, MealDetailsFields, mealDetailsEntry } from './MealDetailsFields';
import './DietEveryday.css';
import { BarcodeFoodLookup } from './BarcodeFoodLookup';
import { DietMealReminders } from './DietMealReminders';
import { dietDiaryCsv } from '../../services/dietDiaryExport';

export function datedPlanDay(start: string | undefined, day: number) {
  if (!start) return '';
  const d = new Date(`${start}T12:00:00`);
  d.setDate(d.getDate() + day - 1);
  return d.toLocaleDateString('en-CA');
}

export function DietEverydayTools({
  profile,
  date,
  diary,
  plan,
  onPreferences,
  onPlan,
  onLogged,
  initialPanel = 'Meals',
  onClose,
}: {
  profile: any;
  date: string;
  diary: Record<string, any[]>;
  plan: FullMealPlan | null;
  onPreferences: (profile: any) => Promise<any>;
  onPlan: (plan: FullMealPlan) => Promise<boolean>;
  onLogged: () => Promise<void>;
  initialPanel?: string;
  onClose?: () => void;
}) {
  const [panel, setPanel] = useState(initialPanel);
  const [state, setState] = useState<DietEveryday>(getDietEveryday);
  const [practical, setPractical] = useState(() => normalizeDietPreferences(profile.practical));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [libraryName, setLibraryName] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [mealType, setMealType] = useState('Lunch');
  const [planDay, setPlanDay] = useState(1);
  const [details, setDetails] = useState(emptyMealDetails);
  const [pantryDraft, setPantryDraft] = useState({ name: '', amount: '', unit: 'g' });
  const [selectedRecent, setSelectedRecent] = useState<string[]>([]);
  const [historyDate, setHistoryDate] = useState(() => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  });
  const scope = () => `${getProfileKey()}:${getProfile()?.id}`;
  useEffect(() => {
    const refresh = () => {
      setState(getDietEveryday());
    };
    window.addEventListener('hc_profile_updated', refresh);
    return () => window.removeEventListener('hc_profile_updated', refresh);
  }, [profile]);
  const run = async (work: () => Promise<any>, success: string) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const before = scope();
    try {
      const result = await work();
      if (before !== scope()) throw new Error('Profile changed. Reopen these tools.');
      if (result === false) throw new Error('Save was not confirmed. Please try again.');
      setState(getDietEveryday());
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete this action.');
    } finally {
      setBusy(false);
    }
  };
  const favorites = state.favorites.filter(
    (item) => !item.deletedAt && item.name.toLowerCase().includes(search.toLowerCase())
  );
  const recent = (diary[historyDate] || []).filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );
  const addFavorite = (meal: any) =>
    run(async () => {
      const current = getDietEveryday();
      if (current.favorites.filter((item) => !item.deletedAt).length >= 200)
        throw new Error('Your library has 200 meals. Remove an unused favorite first.');
      return saveDietEveryday({ favorites: [...current.favorites, favoriteFromMeal(meal)] });
    }, 'Meal saved to your library. It has not been logged as eaten.');
  const logMeal = (meal: any) =>
    run(async () => {
      const result = await createMeal({
        localDate: date,
        captureMethod: 'diet_diary',
        entry: {
          ...reusedMealEntry(meal, mealDetailsEntry(date, details)),
          id: crypto.randomUUID(),
          type: mealType,
          nutritionSource: meal.nutritionSource || 'plan_estimate',
        },
      });
      if (!result.ok) throw new Error('Meal could not be saved. Check the date and amount.');
      await onLogged();
      if (result.sync === 'queue_failed')
        throw new Error('Meal saved on this device. Cloud sync needs attention.');
    }, 'Meal recorded for the selected date. Reused nutrient values remain estimates.');
  const savePlan = async (days: any[], extras = {}) => {
    const now = new Date().toISOString();
    return onPlan(
      normalizeFullMealPlan({
        ...(plan || {}),
        ...extras,
        days,
        plan: days,
        updatedAt: now,
        lifecycle: { ...(plan?.lifecycle || {}), updatedAt: now, status: plan?.status || 'draft' },
      })
    );
  };
  const placeMeal = (meal: any, repeat = false) =>
    run(async () => {
      const days: any[] = plan?.days?.length ? plan.days : [{ day: 1, meals: [] }];
      const destination = days.find((day) => day.day === planDay);
      if (!destination) throw new Error('Choose an available plan day.');
      if (destination?.meals.find((item) => item.type === mealType)?.pinned)
        throw new Error('Unpin the accepted meal before replacing it.');
      const next = days.map((day) =>
        day.day !== planDay
          ? day
          : {
              ...day,
              meals: [
                ...day.meals.filter((item) => item.type !== mealType),
                {
                  ...meal,
                  id: crypto.randomUUID(),
                  type: mealType,
                  servingMultiplier: 1,
                  baseCalories: meal.calories,
                  baseProtein: meal.protein,
                  baseCarbs: meal.carbs,
                  baseFat: meal.fat,
                  macrosNeedReview: meal.calories == null,
                  swapRationale: repeat
                    ? 'Repeated for batch preparation'
                    : 'Chosen from ideas or personal library',
                },
              ],
            }
      );
      return savePlan(next, {
        startDate: plan?.startDate || date,
        title: plan?.title || 'My chosen meals',
      });
    }, 'Draft meal updated. Review quantities and ingredients before shopping; nothing was logged as eaten.');
  const location = effectiveFoodLocation(profile, date);
  const ideaMeals = [
    ...state.favorites.filter((item) => !item.deletedAt),
    ...locationMealIdeas(location.countryCode, profile.cuisine).map((name) => ({
      name,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
    })),
  ].filter(
    (meal) =>
      !practical.dislikes.some((avoid) => meal.name.toLowerCase().includes(avoid.toLowerCase()))
  );
  const selection = state.selectedPlanId === plan?.id ? state.selectedMeals : undefined;
  return (
    <section className="diet-everyday diet-tools" aria-label="Everyday food tools">
      <div className="diet-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h3>Make food fit your day</h3>
          <p>Ideas, reusable meals and practical preferences.</p>
        </div>
        {onClose && <button onClick={onClose}>Close tools</button>}
      </div>
      <div role="tablist" aria-label="Food tools" className="diet-row">
        {[
          'Meals',
          'Ideas',
          'Plan choices',
          'Pantry',
          'Packaged food',
          'Reminders',
          'Preferences',
        ].map((name) => (
          <button
            role="tab"
            aria-selected={panel === name}
            tabIndex={panel === name ? 0 : -1}
            onKeyDown={(event) => {
              const tabs = Array.from(
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]'
                ) || []
              );
              const i = tabs.indexOf(event.currentTarget);
              const n =
                event.key === 'ArrowRight'
                  ? (i + 1) % tabs.length
                  : event.key === 'ArrowLeft'
                    ? (i + tabs.length - 1) % tabs.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? tabs.length - 1
                        : -1;
              if (n >= 0) {
                event.preventDefault();
                tabs[n]?.focus();
                tabs[n]?.click();
              }
            }}
            key={name}
            onClick={() => {
              setPanel(name);
              setMessage('');
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div role="status" aria-live="polite">
        {message}
      </div>
      {panel === 'Packaged food' && <BarcodeFoodLookup date={date} onLogged={onLogged} />}
      {panel === 'Reminders' && <DietMealReminders schedule={profile.mealSchedule} />}
      {panel === 'Preferences' && (
        <>
          <DietPracticalPreferences value={practical} onChange={setPractical} />
          <button
            disabled={busy}
            className="primary"
            onClick={() =>
              run(() => onPreferences({ ...profile, practical }), 'Everyday preferences saved.')
            }
          >
            Save everyday preferences
          </button>
        </>
      )}
      {panel === 'Meals' && (
        <button
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob(['\uFEFF', dietDiaryCsv(diary)], { type: 'text/csv;charset=utf-8' })
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = `healthchain-food-records-${date}.csv`;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Export all dated food records (CSV)
        </button>
      )}
      {['Meals', 'Ideas'].includes(panel) && (
        <>
          <div className="diet-form-grid">
            <label>
              Meal slot
              <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                {[
                  ...dietMealSlots(profile.mealSchedule).map((slot) => slot.name),
                  'Other meals',
                ].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Search meals
              <input value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
          <MealDetailsFields date={date} value={details} onChange={setDetails} />
        </>
      )}
      {panel === 'Meals' && (
        <>
          <h4>My favorites</h4>
          <div className="diet-row">
            <label style={{ flex: 1 }}>
              New favorite name
              <input
                maxLength={240}
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
              />
            </label>
            <button
              disabled={busy || !libraryName.trim()}
              onClick={() => addFavorite({ name: libraryName, calories: null })}
            >
              Save favorite
            </button>
          </div>
          {!favorites.length && (
            <p>No favorites yet. Save a name, a diary meal or an accepted plan meal.</p>
          )}
          {favorites.map((meal) => (
            <article className="diet-tool-card" key={meal.id}>
              <h4>{meal.name}</h4>
              <p>
                {meal.calories == null
                  ? 'Nutrition unknown'
                  : practical.showNumbers
                    ? `${meal.calories} estimated kcal per saved portion`
                    : 'Saved portion; nutrient values are estimates'}
              </p>
              <div className="diet-row">
                <button disabled={busy} className="primary" onClick={() => logMeal(meal)}>
                  Log favorite as eaten
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    setSelectedIdea(meal);
                    setPanel('Ideas');
                  }}
                >
                  Use in plan
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        saveDietEveryday({
                          favorites: getDietEveryday().favorites.map((item) =>
                            item.id === meal.id
                              ? {
                                  ...item,
                                  deletedAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                }
                              : item
                          ),
                        }),
                      'Favorite removed. Existing diary records are preserved.'
                    )
                  }
                >
                  Remove favorite
                </button>
              </div>
            </article>
          ))}
          <h4>Reuse a previous day</h4>
          <label>
            History date
            <input
              type="date"
              value={historyDate}
              max={date}
              onChange={(e) => {
                setHistoryDate(e.target.value);
                setSelectedRecent([]);
              }}
            />
          </label>
          {recent.map((meal) => (
            <article key={meal.id} className="diet-tool-card">
              <label>
                <input
                  type="checkbox"
                  checked={selectedRecent.includes(String(meal.id))}
                  onChange={(e) =>
                    setSelectedRecent((prev) =>
                      e.target.checked
                        ? [...prev, String(meal.id)]
                        : prev.filter((id) => id !== String(meal.id))
                    )
                  }
                />{' '}
                {meal.name}
              </label>
              <div className="diet-row">
                <button disabled={busy} onClick={() => addFavorite(meal)}>
                  Save to favorites
                </button>
                <button disabled={busy} onClick={() => logMeal(meal)}>
                  Repeat this meal
                </button>
              </div>
            </article>
          ))}
          {!recent.length && <p>No matching food records on this date.</p>}
          <button
            disabled={busy || !selectedRecent.length}
            onClick={() =>
              run(async () => {
                const before = scope();
                let saved = 0;
                for (const meal of recent.filter((item) =>
                  selectedRecent.includes(String(item.id))
                )) {
                  if (scope() !== before) throw new Error('Profile changed; copying stopped.');
                  const result = await createMeal({
                    localDate: date,
                    captureMethod: 'diet_diary',
                    entry: {
                      ...meal,
                      id: crypto.randomUUID(),
                      occurredAt: null,
                      timePrecision: 'date_only',
                      hunger: null,
                      fullness: null,
                      note: '',
                      reaction: undefined,
                      nutritionSource:
                        meal.calories == null
                          ? 'name_only'
                          : meal.nutritionSource || 'plan_estimate',
                    },
                  });
                  if (!result.ok) {
                    await onLogged();
                    throw new Error(
                      `${saved} meal(s) saved; copying stopped. Review before retrying.`
                    );
                  }
                  saved++;
                }
                setSelectedRecent([]);
                await onLogged();
              }, 'Selected meals copied as new eating occasions. Their eating times are unknown.')
            }
          >
            Confirm selected meals were eaten on {date}
          </button>
        </>
      )}
      {panel === 'Ideas' && (
        <>
          <p>
            Suggestions are meal names to adapt. Country and cuisine guide familiarity; these are
            not verified recipes or allergy-safe recommendations.
          </p>
          {ideaMeals
            .filter((meal) => meal.name.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 30)
            .map((meal, index) => (
              <button key={index} style={{ margin: 4 }} onClick={() => setSelectedIdea(meal)}>
                {meal.name}
              </button>
            ))}
          <label>
            My own idea
            <input
              value={libraryName}
              maxLength={240}
              onChange={(e) => setLibraryName(e.target.value)}
            />
          </label>
          <button
            disabled={!libraryName.trim()}
            onClick={() =>
              setSelectedIdea({
                name: libraryName.trim(),
                calories: null,
                protein: null,
                carbs: null,
                fat: null,
              })
            }
          >
            Review my idea
          </button>
          {selectedIdea && (
            <article className="diet-tool-card selected">
              <h4>{selectedIdea.name}</h4>
              <p>
                {selectedIdea.steps?.join(' · ') ||
                  'Add ingredients and preparation details in the plan editor. Nutrition is unknown for a name-only idea.'}
              </p>
              <label>
                Destination day
                <select value={planDay} onChange={(e) => setPlanDay(Number(e.target.value))}>
                  {(plan?.days || [{ day: 1 }]).map((day) => (
                    <option key={day.day} value={day.day}>
                      Day {day.day}
                    </option>
                  ))}
                </select>
              </label>
              <div className="diet-row">
                <button disabled={busy} onClick={() => addFavorite(selectedIdea)}>
                  Save idea to favorites
                </button>
                <button disabled={busy} onClick={() => placeMeal(selectedIdea)}>
                  Add to draft plan
                </button>
                <button disabled={busy} onClick={() => logMeal(selectedIdea)}>
                  Confirm I ate this
                </button>
              </div>
            </article>
          )}
        </>
      )}
      {panel === 'Plan choices' && (
        <>
          {!plan ? (
            <p>Create a week or add an idea to a one-day draft first.</p>
          ) : (
            <>
              <label>
                Plan starts on
                <input
                  type="date"
                  value={plan.startDate || date}
                  onChange={(e) => {
                    const startDate = e.target.value;
                    if (startDate)
                      run(
                        () => savePlan(plan.days, { startDate }),
                        'Plan dates updated. Eating records are unchanged.'
                      );
                  }}
                />
              </label>
              <p>
                Select only the meals you want to shop for. Pin accepted meals to protect them from
                replacement. Household quantities are {practical.householdSize} times each chosen
                individual portion; each person’s nutrition stays unchanged.
              </p>
              <div className="diet-row">
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        saveDietEveryday({
                          selectedPlanId: plan.id,
                          selectedMeals: plan.days.flatMap((day) =>
                            day.meals.map((meal) => planMealKey(day.day, meal.id))
                          ),
                        }),
                      'All meals selected for shopping.'
                    )
                  }
                >
                  Select all meals
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => saveDietEveryday({ selectedPlanId: plan.id, selectedMeals: [] }),
                      'Shopping selection cleared.'
                    )
                  }
                >
                  Clear shopping selection
                </button>
              </div>
              {plan.days.map((day) => (
                <details key={day.day}>
                  <summary>
                    Day {day.day} · {datedPlanDay(plan.startDate, day.day) || 'Date not assigned'}
                  </summary>
                  {day.meals.map((meal) => {
                    const key = planMealKey(day.day, meal.id);
                    return (
                      <article key={key} className="diet-tool-card">
                        <label>
                          <input
                            type="checkbox"
                            checked={selection === undefined || selection.includes(key)}
                            onChange={(e) => {
                              const all = plan.days.flatMap((d) =>
                                d.meals.map((m) => planMealKey(d.day, m.id))
                              );
                              const selected = selection || all;
                              run(
                                () =>
                                  saveDietEveryday({
                                    selectedPlanId: plan.id,
                                    selectedMeals: e.target.checked
                                      ? [...selected, key]
                                      : selected.filter((id) => id !== key),
                                  }),
                                'Shopping selection updated.'
                              );
                            }}
                          />{' '}
                          {meal.type}: {meal.name}
                        </label>
                        {meal.ingredients?.length ? (
                          <>
                            <p>
                              Recipe draft for {practical.householdSize} person(s). Individual
                              nutrient estimates remain for one chosen portion. Amounts are raw/dry
                              unless the ingredient name says cooked, canned or ready-to-eat.
                            </p>
                            <ul>
                              {meal.ingredients.map((item, index) => (
                                <li key={index}>
                                  {item.name}:{' '}
                                  {Math.round(
                                    item.amount *
                                      meal.servingMultiplier *
                                      practical.householdSize *
                                      10
                                  ) / 10}{' '}
                                  {item.unit}
                                </li>
                              ))}
                            </ul>
                            <p>{meal.steps?.join(' · ')}</p>
                          </>
                        ) : (
                          <p>
                            Measured ingredients not entered yet. Use the plan editor before relying
                            on shopping quantities.
                          </p>
                        )}
                        <div className="diet-row">
                          <button disabled={busy} onClick={() => addFavorite(meal)}>
                            Save accepted meal
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              run(
                                () =>
                                  savePlan(
                                    plan.days.map((d) => ({
                                      ...d,
                                      meals: d.meals.map((m) =>
                                        d.day === day.day && m.id === meal.id
                                          ? { ...m, pinned: !m.pinned }
                                          : m
                                      ),
                                    }))
                                  ),
                                meal.pinned ? 'Meal unpinned.' : 'Accepted meal pinned.'
                              )
                            }
                          >
                            {meal.pinned ? 'Unpin meal' : 'Pin meal'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIdea(meal);
                              setPanel('Ideas');
                              setPlanDay(day.day);
                              setMealType(meal.type);
                            }}
                          >
                            Repeat or adapt
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </details>
              ))}
            </>
          )}
        </>
      )}
      {panel === 'Pantry' && (
        <>
          <p>
            Enter usable stock. Shopping subtracts only matching ingredients with the same unit. No
            conversion from pieces to grams is guessed.
          </p>
          <div className="diet-form-grid">
            <label>
              Ingredient name
              <input
                value={pantryDraft.name}
                onChange={(e) => setPantryDraft({ ...pantryDraft, name: e.target.value })}
                maxLength={80}
              />
            </label>
            <label>
              Available amount
              <input
                type="number"
                step="any"
                min="0.1"
                max="100000"
                value={pantryDraft.amount}
                onChange={(e) => setPantryDraft({ ...pantryDraft, amount: e.target.value })}
              />
            </label>
            <label>
              Stock unit
              <select
                value={pantryDraft.unit}
                onChange={(e) => setPantryDraft({ ...pantryDraft, unit: e.target.value })}
              >
                {['g', 'ml', 'piece'].map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            disabled={
              busy ||
              !pantryDraft.name.trim() ||
              !(Number(pantryDraft.amount) > 0) ||
              Number(pantryDraft.amount) > 100000
            }
            onClick={() =>
              run(async () => {
                const result = await saveDietEveryday({
                  pantry: [
                    ...getDietEveryday().pantry,
                    {
                      id: crypto.randomUUID(),
                      name: pantryDraft.name.trim(),
                      amount: Number(pantryDraft.amount),
                      unit: pantryDraft.unit as any,
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                });
                if (result) setPantryDraft({ name: '', amount: '', unit: 'g' });
                return result;
              }, 'Pantry stock saved.')
            }
          >
            Add pantry stock
          </button>
          {state.pantry
            .filter((item) => !item.deletedAt)
            .map((item) => (
              <div className="diet-tool-card diet-row" key={item.id}>
                <strong>
                  {item.name} · {item.amount} {item.unit}
                </strong>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        saveDietEveryday({
                          pantry: getDietEveryday().pantry.map((old) =>
                            old.id === item.id
                              ? {
                                  ...old,
                                  deletedAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                }
                              : old
                          ),
                        }),
                      'Stock removed.'
                    )
                  }
                >
                  Remove stock
                </button>
              </div>
            ))}
        </>
      )}
    </section>
  );
}
