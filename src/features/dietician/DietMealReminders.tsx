import { useState } from 'react';
import { dietMealSlots } from '../../../shared/diet-preferences';
import { validMealReminderTime } from '../../../shared/diet-reminders';
import { getDietEveryday, saveDietEveryday, type MealReminder } from '../../services/dietEveryday';
import {
  reconcileDietMealReminders,
  supportsNativeMealReminders,
} from '../../services/DietMealReminderService';
import { requestNotificationPermission } from '../../services/NotificationDeviceService';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../../services/NotificationEngine';
import { getActiveProfileScope } from '../../services/profileScope';
export function DietMealReminders({ schedule }: { schedule: string }) {
  const stored = getDietEveryday();
  const [categoryEnabled, setCategoryEnabled] = useState(
    () => getNotificationPreferences().enabledCategories.meal_reminder !== false
  );
  const [rows, setRows] = useState<MealReminder[]>(
    stored.reminders ||
      dietMealSlots(schedule).map((slot, index) => ({
        id: crypto.randomUUID(),
        label: slot.name,
        time:
          {
            Breakfast: '08:00',
            Lunch: '13:00',
            Dinner: '19:00',
            Snack: '16:00',
            'Morning Snack': '10:00',
            'Evening Snack': '16:00',
          }[slot.name] || '12:00',
        enabled: false,
        prepMinutes: 0,
      }))
  );
  const [quietStart, setQuietStart] = useState(stored.quietStart || ''),
    [quietEnd, setQuietEnd] = useState(stored.quietEnd || ''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy) return;
    if (
      rows.some((row) => !validMealReminderTime(row.time) || !row.label.trim()) ||
      ((quietStart || quietEnd) &&
        (!validMealReminderTime(quietStart) || !validMealReminderTime(quietEnd)))
    ) {
      setMessage('Check reminder times and both quiet-hours boundaries.');
      return;
    }
    setBusy(true);
    const scope = getActiveProfileScope();
    try {
      if (
        supportsNativeMealReminders() &&
        categoryEnabled &&
        rows.some((row) => row.enabled) &&
        !(await requestNotificationPermission())
      ) {
        setMessage('Notification permission was not granted. Reminders were not enabled.');
        return;
      }
      if (scope !== getActiveProfileScope())
        throw new Error('Profile changed. Reopen food reminders.');
      if (!(await saveDietEveryday({ reminders: rows, quietStart, quietEnd })))
        throw new Error('Reminder settings were not saved.');
      saveNotificationPreferences({
        enabledCategories: {
          ...getNotificationPreferences().enabledCategories,
          meal_reminder: categoryEnabled,
        },
      });
      setMessage(
        (await reconcileDietMealReminders(true))
          ? supportsNativeMealReminders()
            ? 'Native schedule updated. Reminders during quiet hours are suppressed. Device permissions and OS settings affect delivery.'
            : 'In-app reminders saved. They appear while HealthChain is open; this browser cannot deliver these recurring reminders after it closes.'
          : 'Settings saved, but native scheduling failed. Check notification permission and retry.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reminder update failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="diet-everyday">
      <h4>Optional food reminders</h4>
      <p>
        {supportsNativeMealReminders()
          ? 'Schedule meal and preparation notifications on this device.'
          : 'Browser reminders appear in the app notification panel while HealthChain is open. Closed-browser delivery is not supported.'}{' '}
        Times follow the device’s local timezone. Lock-screen text hides meal details.
      </p>
      <label>
        <input
          type="checkbox"
          checked={categoryEnabled}
          onChange={(event) => setCategoryEnabled(event.target.checked)}
        />{' '}
        Allow food reminder notifications on this device
      </label>
      {rows.map((row, index) => (
        <fieldset key={row.id}>
          <legend>{row.label}</legend>
          <label>
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(e) =>
                setRows(
                  rows.map((item, i) =>
                    i === index ? { ...item, enabled: e.target.checked } : item
                  )
                )
              }
            />{' '}
            Enable this reminder
          </label>
          <div className="diet-form-grid">
            <label>
              Meal name
              <input
                maxLength={60}
                value={row.label}
                onChange={(e) =>
                  setRows(
                    rows.map((item, i) => (i === index ? { ...item, label: e.target.value } : item))
                  )
                }
              />
            </label>
            <label>
              Local meal time
              <input
                type="time"
                value={row.time}
                onChange={(e) =>
                  setRows(
                    rows.map((item, i) => (i === index ? { ...item, time: e.target.value } : item))
                  )
                }
              />
            </label>
            <label>
              Preparation reminder
              <select
                value={row.prepMinutes}
                onChange={(e) =>
                  setRows(
                    rows.map((item, i) =>
                      i === index ? { ...item, prepMinutes: Number(e.target.value) } : item
                    )
                  )
                }
              >
                {[0, 15, 30, 60, 120].map((n) => (
                  <option key={n} value={n}>
                    {n ? `${n} minutes before` : 'None'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button onClick={() => setRows(rows.filter((_, i) => i !== index))}>
            Remove reminder
          </button>
        </fieldset>
      ))}
      <div className="diet-form-grid">
        <label>
          Quiet hours start
          <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
        </label>
        <label>
          Quiet hours end
          <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
        </label>
      </div>
      <p>
        Identical quiet-hours boundaries disable quiet hours. Uncheck notification permission above,
        or disable each reminder, to stop food reminders here.
      </p>
      <div className="diet-row">
        <button
          disabled={busy || rows.length >= 12}
          onClick={() =>
            setRows([
              ...rows,
              {
                id: crypto.randomUUID(),
                label: 'Meal',
                time: '12:00',
                enabled: false,
                prepMinutes: 0,
              },
            ])
          }
        >
          Add a reminder
        </button>
        <button
          onClick={() => {
            setQuietStart('');
            setQuietEnd('');
          }}
        >
          Clear quiet hours
        </button>
        <button disabled={busy} className="primary" onClick={save}>
          Save food reminders
        </button>
      </div>
      <div role="status">{message}</div>
    </div>
  );
}
