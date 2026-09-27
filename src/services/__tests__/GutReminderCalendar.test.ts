import { describe, expect, it } from 'vitest';
import { buildGutReminderCalendar } from '../GutReminderCalendar';

describe('Gut calendar reminders', () => {
  it('exports an alarm with no health details in its title', () => {
    const result = buildGutReminderCalendar('question-123', '2030-05-04', '09:30', new Date('2030-05-01T00:00:00Z'));
    expect(result).toContain('BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0M');
    expect(result).toContain('SUMMARY:Your HealthChain reminder');
    expect(result).toContain('END:VCALENDAR\r\n');
    expect(result).toContain('DTSTART:');
  });
  it('rejects a past time and malformed dates', () => {
    expect(() => buildGutReminderCalendar('q', '2020-01-01', '09:00')).toThrow();
    expect(() => buildGutReminderCalendar('q', '2030-05-04', '27:60')).toThrow();
  });
});
