import { useEffect, useRef, useState } from 'react';
import { listMealDiary, type MealDiary } from '../services/MealCommandService';
import { listObservationHistory } from '../services/HealthObservationService';
import { getActiveProfileScope } from '../services/profileScope';
import type { Observation } from '../domain/observations/types';
/** Review screens use the same diary/tombstones as logging and never cross an account change. */
export function useDietReviewData() {
  const [diary, setDiary] = useState<MealDiary>({});
  const [observations, setObservations] = useState<Observation[]>([]);
  const [error, setError] = useState('');
  const scopeRef = useRef(getActiveProfileScope());
  useEffect(() => {
    let active = true,
      revision = 0;
    const refresh = async () => {
      const scope = getActiveProfileScope(),
        request = ++revision;
      if (scopeRef.current !== scope) {
        scopeRef.current = scope;
        setDiary({});
        setObservations([]);
      }
      try {
        const [next, records] = await Promise.all([listMealDiary(), listObservationHistory()]);
        if (active && request === revision && scope === getActiveProfileScope()) {
          setDiary(next);
          setObservations(records.filter((record) => !record.deletedAt));
          setError('');
        }
      } catch {
        if (active && request === revision)
          setError('Saved food records could not be loaded. Reopen this view to retry.');
      }
    };
    void refresh();
    const names = [
      'hc_profile_updated',
      'hc_observations_updated',
      'hc_nutrition_reaction_updated',
      'storage',
    ];
    names.forEach((name) => window.addEventListener(name, refresh));
    return () => {
      active = false;
      names.forEach((name) => window.removeEventListener(name, refresh));
    };
  }, []);
  return { diary, observations, error };
}
