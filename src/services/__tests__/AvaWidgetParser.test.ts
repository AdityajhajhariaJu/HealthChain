// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractBalancedWidget } from '../../features/consultation/AvaHealthBuddy';

describe('Ava extractBalancedWidget Parser', () => {
  it('extracts DIARY_TIMELINE widget with nested arrays without leaking JSON', () => {
    const raw = `I have logged your meal in your diary:\n[WIDGET:DIARY_TIMELINE:{"title":"Logged in your diary","date":"Today","entries":[{"time":"08:00","category":"Breakfast","items":["🥣 Oats","🫐 Blueberries","☕ Coffee"]},{"time":"13:00","category":"Lunch","items":["🥩 Salami","🍷 Red Wine"]}]}]\nMake sure to stay well hydrated this afternoon!`;

    const { payload, before, after, found } = extractBalancedWidget(raw, 'DIARY_TIMELINE');

    expect(found).toBe(true);
    expect(before).toBe('I have logged your meal in your diary:');
    expect(after).toBe('Make sure to stay well hydrated this afternoon!');
    expect(payload).toBeDefined();
    expect(payload.title).toBe('Logged in your diary');
    expect(payload.entries).toHaveLength(2);
    expect(payload.entries[0].items).toEqual(['🥣 Oats', '🫐 Blueberries', '☕ Coffee']);
    expect(payload.entries[1].items).toEqual(['🥩 Salami', '🍷 Red Wine']);
    // Verify zero JSON or widget tags in before or after
    expect(before).not.toContain('{');
    expect(before).not.toContain('WIDGET');
    expect(after).not.toContain('}');
    expect(after).not.toContain('WIDGET');
  });

  it('extracts TRIGGER_CARD widget cleanly with sensitivities and ingredients', () => {
    const raw = `Here is what the data indicates for your symptoms:\n[WIDGET:TRIGGER_CARD:{"symptom":"Bloating","reactionWindow":"within 1 day","sensitivities":[{"id":"histamine","name":"Histamine","icon":"flask","daysTracked":18,"correlationPercent":42}],"ingredients":[{"id":"red_wine","name":"Red Wine","icon":"wine","daysTracked":12,"correlationPercent":34}]}]\nWe can run an elimination trial if you like.`;

    const { payload, before, after, found } = extractBalancedWidget(raw, 'TRIGGER_CARD');

    expect(found).toBe(true);
    expect(before).toBe('Here is what the data indicates for your symptoms:');
    expect(after).toBe('We can run an elimination trial if you like.');
    expect(payload.symptom).toBe('Bloating');
    expect(payload.sensitivities[0].name).toBe('Histamine');
    expect(payload.ingredients[0].name).toBe('Red Wine');
  });

  it('safely handles extra whitespace and newlines inside widget tags', () => {
    const raw = `Observing your gut signals:\n[WIDGET:TRIGGER_CARD: {"symptom":"Headache","reactionWindow":"within 2 hours","sensitivities":[],"ingredients":[]} ]\nLet me know if this resonates.`;

    const { payload, before, after, found } = extractBalancedWidget(raw, 'TRIGGER_CARD');

    expect(found).toBe(true);
    expect(payload.symptom).toBe('Headache');
    expect(before).toBe('Observing your gut signals:');
    expect(after).toBe('Let me know if this resonates.');
  });

  it('strips broken or truncated widget syntax so no raw JSON leaks to user', () => {
    const raw = `Here is your checkin:\n[WIDGET:DIARY_TIMELINE:{"title":"Incomplete JSON", "entries":[\nPlease let me know how you feel!`;

    const { payload, before, after, found } = extractBalancedWidget(raw, 'DIARY_TIMELINE');

    expect(found).toBe(true);
    expect(payload).toBeNull();
    // Ensures raw JSON syntax was stripped and didn't spill into the chat
    expect(before).toBe('Here is your checkin:');
    expect(before).not.toContain('entries');
  });

  it('returns found: false when no widget tag is present', () => {
    const raw = 'Just a normal friendly consultation response from Ava.';
    const { payload, before, after, found } = extractBalancedWidget(raw, 'DIARY_TIMELINE');
    expect(found).toBe(false);
    expect(payload).toBeNull();
    expect(before).toBe(raw);
    expect(after).toBe('');
  });
});
