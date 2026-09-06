// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractBalancedWidget } from '../../features/consultation/AvaHealthBuddy';

describe('Ava Connection Trigger & Multi-System Widget Parser', () => {
  it('extracts CONNECTION_TRIGGER_CARD widget cleanly with kinetic pathways and suspect vectors', () => {
    const raw = `Your clinical presentation suggests a direct kinetic chain referral:\n[WIDGET:CONNECTION_TRIGGER_CARD:{"symptom":"Occipital & Temple Headache","reactionWindow":"within 2h of desk immobility","confidencePercent":86,"upstreamRootCause":"Lumbar Facet & Sacral Torsion (Pelvic Torque)","kineticPathway":["L4-S1 Pelvic Compression","Thoracolumbar Fascial Pull","C1-C2 Suboccipital Tension","Greater Occipital Nerve","Temporal / Ocular Cephalgia"],"suspectVectors":[{"id":"kinetic_pelvic","category":"biomechanical","name":"Sacral Torsion & Dural Pull","icon":"🦴","correlationPercent":86,"instancesTracked":14,"mechanism":"Prolonged seated lumbar slouch pulls continuous spinal dural sleeve to occiput."},{"id":"vascular_adenosine","category":"vascular","name":"Caffeine Rebound & Dehydration","icon":"☕","correlationPercent":44,"instancesTracked":9,"mechanism":"Adenosine receptor upregulation post-espresso triggers reactive cerebral vasodilation."}]}]\nWould you like to try the 3-minute pelvic decompression protocol now?`;

    const { payload, before, after, found } = extractBalancedWidget(raw, 'CONNECTION_TRIGGER_CARD');

    expect(found).toBe(true);
    expect(before).toBe('Your clinical presentation suggests a direct kinetic chain referral:');
    expect(after).toBe('Would you like to try the 3-minute pelvic decompression protocol now?');
    expect(payload).toBeDefined();
    expect(payload.symptom).toBe('Occipital & Temple Headache');
    expect(payload.confidencePercent).toBe(86);
    expect(payload.upstreamRootCause).toContain('Pelvic Torque');
    expect(payload.kineticPathway).toHaveLength(5);
    expect(payload.kineticPathway[0]).toBe('L4-S1 Pelvic Compression');
    expect(payload.suspectVectors).toHaveLength(2);
    expect(payload.suspectVectors[0].category).toBe('biomechanical');
    expect(payload.suspectVectors[1].category).toBe('vascular');

    // Verify zero JSON leakage
    expect(before).not.toContain('{');
    expect(before).not.toContain('WIDGET');
    expect(after).not.toContain('}');
    expect(after).not.toContain('WIDGET');
  });

  it('extracts multi-system DIARY_TIMELINE with posture, vascular, and symptom categories', () => {
    const raw = `I have logged your multi-system checkin:\n[WIDGET:DIARY_TIMELINE:{"title":"Logged in your diary","date":"Today","entries":[{"time":"08:00","category":"Breakfast","items":["🥣 Oats","🫐 Blueberries"]},{"time":"11:30","category":"Posture","items":["🪑 3.5h Seated Desk Slouch"]},{"time":"15:00","category":"Symptoms","items":["🦴 Lower Back Ache 4/10","⚡ Throbbing Headache 7/10"]}]}]\nMake sure to decompress your spine this afternoon.`;

    const { payload, before, after, found } = extractBalancedWidget(raw, 'DIARY_TIMELINE');

    expect(found).toBe(true);
    expect(payload).toBeDefined();
    expect(payload.entries).toHaveLength(3);
    expect(payload.entries[1].category).toBe('Posture');
    expect(payload.entries[1].items[0]).toContain('Desk Slouch');
    expect(payload.entries[2].category).toBe('Symptoms');
    expect(payload.entries[2].items).toEqual(['🦴 Lower Back Ache 4/10', '⚡ Throbbing Headache 7/10']);
  });
});
