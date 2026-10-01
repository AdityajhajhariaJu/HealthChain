export const validMealReminderTime = (value) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function quietMealMinute(minute, start, end) {
  if (!validMealReminderTime(start) || !validMealReminderTime(end) || start === end) return false;
  const parse = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const a = parse(start),
    b = parse(end);
  return a < b ? minute >= a && minute < b : minute >= a || minute < b;
}
export function mealReminderEvents(reminders, quietStart, quietEnd) {
  const events = [];
  for (const [index, item] of (Array.isArray(reminders) ? reminders : []).slice(0, 12).entries()) {
    if (
      !item?.enabled ||
      !validMealReminderTime(item.time) ||
      !item.id ||
      typeof item.label !== 'string'
    )
      continue;
    const minute = Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3));
    const prep =
      Number.isInteger(item.prepMinutes) && item.prepMinutes > 0 && item.prepMinutes <= 120
        ? item.prepMinutes
        : 0;
    for (const event of [
      { minute, kind: 'meal', id: 4000 + index * 2 },
      ...(prep
        ? [{ minute: (minute - prep + 1440) % 1440, kind: 'prep', id: 4001 + index * 2 }]
        : []),
    ]) {
      if (!quietMealMinute(event.minute, quietStart, quietEnd))
        events.push({ ...event, reminderId: item.id, label: item.label.slice(0, 60) });
    }
  }
  return events;
}
