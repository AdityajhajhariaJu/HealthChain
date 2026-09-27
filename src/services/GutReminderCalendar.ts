/** A calendar alarm runs in the calendar chosen by the user, including with the site closed. */
export function buildGutReminderCalendar(threadId: string, date: string, time: string, now = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid date and time.');
  const at = new Date(`${date}T${time}:00`);
  if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) throw new Error('Choose a reminder time in the future.');
  const stamp = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const uid = threadId.replace(/[^a-zA-Z0-9-]/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HealthChain//Gut reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:gut-${uid}-${stamp(at)}@healthchain360.com`, `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(at)}`, `DTEND:${stamp(new Date(at.getTime() + 15 * 60000))}`,
    'SUMMARY:Your HealthChain reminder',
    'DESCRIPTION:Open My research to revisit your saved question.',
    'URL:https://healthchain360.com/app/today?gut=1',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:Your HealthChain reminder',
    'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export function downloadGutReminder(threadId: string, date: string, time: string): void {
  const calendar = buildGutReminderCalendar(threadId, date, time);
  const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'healthchain-reminder.ics';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
