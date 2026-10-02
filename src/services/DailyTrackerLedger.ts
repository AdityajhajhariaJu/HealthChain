import type {
  Observation,
  ObservationDraft,
  ObservationPayload,
} from '../domain/observations/types';
import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { createCoalescedTask } from './CoalescedTask';
import {
  captureObservationScope,
  createObservation,
  deleteObservation,
  listObservationHistory,
  reviseObservation,
} from './HealthObservationService';
import type { HydrationDayData } from './HydrationService';
import { normalizeMedications } from './MedicationScheduleModel';
import { getProfile } from './ProfileEngine';
import { getItemSync, setItemSync } from './storage';
import type { VitaminItem } from './VitaminScheduleService';

let queue: Promise<unknown> = Promise.resolve();
function serialize(work: () => Promise<void>) {
  const result = queue.catch(() => {}).then(work);
  queue = result;
  void result.catch((error) =>
    window.dispatchEvent(
      new CustomEvent('hc_sync_error', {
        detail: {
          area: 'daily_trackers',
          message:
            error instanceof Error
              ? error.message
              : 'Daily records could not be queued. Your device copy was retained.',
        },
      })
    )
  );
  return result;
}
export async function flushDailyTrackerLedger() {
  await queue;
}
function draft(
  scope: { ownerId: string; profileId: string },
  localDate: string,
  payload: ObservationPayload,
  idempotencyKey: string,
  occurredAt: string | null
): ObservationDraft {
  return {
    ...scope,
    payload,
    idempotencyKey,
    localDate,
    occurredAt,
    timezone: occurredAt ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
    timePrecision: occurredAt ? 'exact' : 'date_only',
    source: occurredAt ? 'today' : 'legacy',
    evidenceType: 'user_report',
  };
}
async function save(draft: ObservationDraft, previous?: Observation) {
  if (previous?.deletedAt) return; // A cloud/local tombstone must never be resurrected by migration.
  if (previous && JSON.stringify(previous.payload) === JSON.stringify(draft.payload)) return;
  const doseChanged =
    draft.payload.kind === 'medication_dose' &&
    previous?.payload.kind === 'medication_dose' &&
    draft.payload.status !== previous.payload.status;
  const result = previous
    ? await reviseObservation(previous.id, previous.revision, {
        ...draft,
        ...(doseChanged
          ? {}
          : {
              source: previous.source,
              occurredAt: previous.occurredAt,
              timezone: previous.timezone,
              timePrecision: previous.timePrecision,
            }),
        references: previous.references,
      })
    : await createObservation(draft);
  if (!result.ok || result.sync === 'queue_failed')
    throw new Error('Daily records are saved on this device, but need a sync retry.');
}
/** Bridge existing tracker UI to one durable event per measured drink. */
export function syncHydrationDay(data: HydrationDayData, migrationOnly = false) {
  const account = captureAccountScope(),
    snapshot = JSON.parse(JSON.stringify(data)) as HydrationDayData;
  return serialize(async () => {
    if (!isAccountScopeCurrent(account)) return;
    const scope = await captureObservationScope();
    if (!scope || !isAccountScopeCurrent(account)) return;
    const history = await listObservationHistory();
    if (!isAccountScopeCurrent(account)) return;
    const prefix = `hydration:${snapshot.date}:`;
    const previous = history.filter(
      (item) => item.payload.kind === 'hydration' && item.idempotencyKey.startsWith(prefix)
    );
    const previousByKey = new Map(previous.map((item) => [item.idempotencyKey, item]));
    const present = new Set(snapshot.logs.map((log) => prefix + log.id));
    for (const log of snapshot.logs) {
      if (!isAccountScopeCurrent(account)) return;
      const stable = prefix + log.id;
      if (migrationOnly && previousByKey.has(stable)) continue;
      await save(
        draft(
          scope,
          snapshot.date,
          {
            kind: 'hydration',
            amountMl: log.amountMl,
            drinkType: log.type,
            legacyLogId: log.id,
            targetMl: snapshot.targetMl,
          },
          stable,
          log.occurredAt || null
        ),
        previousByKey.get(stable)
      );
    }
    for (const item of previous)
      if (!migrationOnly && !item.deletedAt && !present.has(item.idempotencyKey)) {
        if (!isAccountScopeCurrent(account)) return;
        const result = await deleteObservation(item.id, item.revision);
        if (!result.ok) throw new Error('Drink removal needs a sync retry.');
      }
  });
}
/** A completion flag is a report of ingestion, never an inference from the schedule. */
export function syncMedicationDose(
  item: VitaminItem,
  localDate: string,
  status: 'taken' | 'skipped' | 'unknown',
  occurredAt: string | null = null,
  migrationOnly = false
) {
  const account = captureAccountScope(),
    snapshot = JSON.parse(JSON.stringify(item)) as VitaminItem;
  return serialize(async () => {
    if (!isAccountScopeCurrent(account)) return;
    const scope = await captureObservationScope();
    if (!scope || !isAccountScopeCurrent(account)) return;
    const stable = `dose:${localDate}:${snapshot.id}:${snapshot.time || 'unscheduled'}`;
    const previous = (await listObservationHistory()).find(
      (item) => item.idempotencyKey === stable
    );
    if (!isAccountScopeCurrent(account)) return;
    if (migrationOnly && previous) return;
    await save(
      draft(
        scope,
        localDate,
        {
          kind: 'medication_dose',
          medicationId: snapshot.id,
          name: snapshot.name,
          dosage: snapshot.dosage,
          scheduledTime: snapshot.time || null,
          status,
        },
        stable,
        occurredAt
      ),
      previous
    );
  });
}
/** Hydration and adherence retain their exact units when a second device loads the ledger. */
export async function hydrateDailyTrackerProjections() {
  const account = captureAccountScope();
  await flushDailyTrackerLedger().catch(() => {});
  const history = await listObservationHistory();
  if (!isAccountScopeCurrent(account)) return;
  const namespace = `hc_unified_profile_${account.accountId}:${account.profileId}`;
  const days = new Map<string, { hydration: Observation[]; doses: Observation[] }>();
  for (const item of history) {
    if (!item.localDate || !['hydration', 'medication_dose'].includes(item.payload.kind)) continue;
    let day = days.get(item.localDate);
    if (!day) {
      day = { hydration: [], doses: [] };
      days.set(item.localDate, day);
    }
    (item.payload.kind === 'hydration' ? day.hydration : day.doses).push(item);
  }
  let hydrationChanged = false,
    dosesChanged = false;
  const persistChanged = (key: string, value: string) => {
    if (getItemSync(key) === value) return false;
    setItemSync(key, value);
    return true;
  };
  for (const [date, day] of days) {
    const drinks = day.hydration.filter((item) => !item.deletedAt);
    if (day.hydration.length) {
      const key = `healthchain_hydration_data_${date}:${namespace}`;
      let before: any = {};
      try {
        before = JSON.parse(getItemSync(key) || '{}');
      } catch {}
      const logs = drinks.map((item) => {
        const payload = item.payload as Extract<ObservationPayload, { kind: 'hydration' }>;
        return {
          id: payload.legacyLogId || item.id,
          amountMl: payload.amountMl,
          type: payload.drinkType,
          occurredAt: item.occurredAt,
          timestamp: item.occurredAt
            ? new Date(item.occurredAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Time not recorded',
        };
      });
      const currentMl = logs.reduce((sum, log) => sum + log.amountMl, 0);
      hydrationChanged =
        persistChanged(key, JSON.stringify({ ...before, date, logs, currentMl })) ||
        hydrationChanged;
    }
    const doses = day.doses;
    if (doses.length) {
      const key = `healthchain_vitamins_taken_logs_${date}:${namespace}`;
      let before: Record<string, boolean> = {};
      try {
        before = JSON.parse(getItemSync(key) || '{}');
      } catch {}
      for (const item of doses) {
        const payload = item.payload as Extract<ObservationPayload, { kind: 'medication_dose' }>;
        before[payload.medicationId] = !item.deletedAt && payload.status === 'taken';
      }
      dosesChanged = persistChanged(key, JSON.stringify(before)) || dosesChanged;
    }
  }
  if (hydrationChanged) window.dispatchEvent(new Event('hc_hydration_updated'));
  if (dosesChanged) window.dispatchEvent(new Event('hc_vitamins_updated'));
}
export async function migrateDailyTrackerHistory() {
  const account = captureAccountScope(),
    namespace = `hc_unified_profile_${account.accountId}:${account.profileId}`;
  const migrationKey = `hc_daily_ledger_migrated:${account.accountId}:${account.profileId}`;
  if (getItemSync(migrationKey) === 'v1') return;
  const inventory = normalizeMedications(getProfile().medications);
  for (const key of Object.keys(localStorage)) {
    if (!isAccountScopeCurrent(account)) return;
    if (key.startsWith('healthchain_hydration_data_') && key.endsWith(':' + namespace)) {
      let data: HydrationDayData;
      try {
        data = JSON.parse(getItemSync(key) || '{}');
      } catch {
        continue;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(data.date) && Array.isArray(data.logs))
        await syncHydrationDay(data, true);
    }
    if (key.startsWith('healthchain_vitamins_taken_logs_') && key.endsWith(':' + namespace)) {
      const date = key.slice('healthchain_vitamins_taken_logs_'.length).split(':')[0];
      let data: Record<string, boolean>;
      try {
        data = JSON.parse(getItemSync(key) || '{}');
      } catch {
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !data || typeof data !== 'object') continue;
      for (const [id, taken] of Object.entries(data)) {
        const item = inventory.find((item) => item.id === id);
        if (item && taken === true) await syncMedicationDose(item, date, 'taken', null, true);
      }
    }
  }
  await flushDailyTrackerLedger();
  if (isAccountScopeCurrent(account)) setItemSync(migrationKey, 'v1');
}

const refreshProjections = createCoalescedTask(hydrateDailyTrackerProjections);
if (typeof window !== 'undefined')
  window.addEventListener('hc_observations_updated', () => {
    void refreshProjections().catch(() => {});
  });
