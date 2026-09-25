import { describe, it, expect } from 'vitest';
import { CLINICAL_CATALOG, CATEGORIES, CATEGORY_CONFIG, PillCategory } from '../VitaminSchedulerModal';

describe('VitaminSchedulerModal Catalog & Categories', () => {
  it('exports all 7 structured categories with proper icons', () => {
    expect(CATEGORIES).toContain('All');
    expect(CATEGORIES).toContain('Daily Essentials');
    expect(CATEGORIES).toContain('Vitamins & Minerals');
    expect(CATEGORIES).toContain('Longevity & Energy');
    expect(CATEGORIES).toContain('Sleep & Calm');
    expect(CATEGORIES).toContain('Gut & Digestion');
    expect(CATEGORIES).toContain('Prescriptions (Rx)');

    CATEGORIES.forEach((cat) => {
      expect(CATEGORY_CONFIG[cat]).toBeDefined();
      expect(CATEGORY_CONFIG[cat].label).toBe(cat);
      expect(CATEGORY_CONFIG[cat].icon).toBeTruthy();
    });
  });

  it('contains at least 45 search names', () => {
    expect(CLINICAL_CATALOG.length).toBeGreaterThanOrEqual(45);
  });

  it('keeps search labels free of preset directions and unreviewed claims', () => {
    CLINICAL_CATALOG.forEach((item) => {
      expect(item.name.trim().length).toBeGreaterThan(0);
      expect(item.dosage).toBe('');
      expect(item.benefit.trim().length).toBeGreaterThan(0);
      expect(item.rationale).toBe('');
      expect(item.defaultTime).toBe('');
      expect(CATEGORIES).toContain(item.category);
      expect(['capsule', 'tablet', 'droplet', 'leaf', 'syringe', 'inhaler']).toContain(item.iconKind);
      expect(item.color1).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(item.color2).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('verifies each category has a robust selection of formulations', () => {
    const activeCategories: PillCategory[] = [
      'Daily Essentials',
      'Vitamins & Minerals',
      'Longevity & Energy',
      'Sleep & Calm',
      'Gut & Digestion',
      'Prescriptions (Rx)'
    ];

    activeCategories.forEach((cat) => {
      const items = CLINICAL_CATALOG.filter(p => p.category === cat);
      expect(items.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('includes common search names like Collagen Peptides, Creatine, and Berberine', () => {
    const names = CLINICAL_CATALOG.map(p => p.name.toLowerCase());
    expect(names.some(n => n.includes('collagen peptides'))).toBe(true);
    expect(names.some(n => n.includes('creatine'))).toBe(true);
    expect(names.some(n => n.includes('berberine'))).toBe(true);
    expect(names.some(n => n.includes('probiotics'))).toBe(true);
    expect(names.some(n => n.includes('melatonin'))).toBe(true);
  });
});
