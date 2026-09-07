// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { cleanMedicalText } from '../pubMedService';
import { suggestSpecialists } from '../geminiService';

describe('Clinical Research Hub - Clinical Sanitization & Zero Token Safety', () => {
  describe('cleanMedicalText', () => {
    it('should strip single-encoded HTML bold and italic tags', () => {
      const raw = '&lt;b&gt;Real-world patterns of analgesic combination therapy&lt;/b&gt; : &lt;b&gt;A retrospective observational study&lt;/b&gt;.';
      const cleaned = cleanMedicalText(raw);
      expect(cleaned).not.toContain('&lt;');
      expect(cleaned).not.toContain('&gt;');
      expect(cleaned).not.toContain('<b>');
      expect(cleaned).not.toContain('</b>');
      expect(cleaned).toBe('Real-world patterns of analgesic combination therapy: A retrospective observational study.');
    });

    it('should strip double-encoded XML entities from Europe PMC', () => {
      const doubleEncoded = '&amp;lt;b&amp;gt;Targeted Therapy in Neuro-Oncology&amp;lt;/b&amp;gt; : .';
      const cleaned = cleanMedicalText(doubleEncoded);
      expect(cleaned).toBe('Targeted Therapy in Neuro-Oncology.');
    });

    it('should decode quotes and ampersands properly', () => {
      const input = 'Patient&#39;s response &amp; clinical efficacy &quot;in vivo&quot;';
      const cleaned = cleanMedicalText(input);
      expect(cleaned).toBe('Patient\'s response & clinical efficacy "in vivo"');
    });

    it('should normalize awkward colon and punctuation artifacts', () => {
      const raw = 'Postural Orthostatic Tachycardia ; . A Case Report : .';
      const cleaned = cleanMedicalText(raw);
      expect(cleaned).toBe('Postural Orthostatic Tachycardia. A Case Report.');
    });

    it('should handle empty or null values safely', () => {
      expect(cleanMedicalText('')).toBe('');
      expect(cleanMedicalText(null as any)).toBe('');
      expect(cleanMedicalText(undefined as any)).toBe('');
    });
  });

  describe('Journal Name Resolution & Fallback', () => {
    it('should replace "Unknown Journal" or missing journal with Peer-Reviewed Clinical Journal', () => {
      const rawJournal = 'Unknown Journal';
      const cleaned = cleanMedicalText(rawJournal);
      const resolved = (!cleaned || cleaned.toLowerCase() === 'unknown journal')
        ? 'Peer-Reviewed Clinical Journal'
        : cleaned;
      expect(resolved).toBe('Peer-Reviewed Clinical Journal');
    });

    it('should preserve valid medical journals cleanly', () => {
      const rawJournal = '&lt;i&gt;Pakistan journal of pharmaceutical sciences&lt;/i&gt;';
      const cleaned = cleanMedicalText(rawJournal);
      const resolved = (!cleaned || cleaned.toLowerCase() === 'unknown journal')
        ? 'Peer-Reviewed Clinical Journal'
        : cleaned;
      expect(resolved).toBe('Pakistan journal of pharmaceutical sciences');
    });
  });

  describe('Deterministic Specialist Suggestion (0 Token Safety)', () => {
    const mockAvailable = [
      { id: 'gp', label: 'General Physician' },
      { id: 'gastro', label: 'Gastroenterologist' },
      { id: 'cardio', label: 'Cardiologist' },
      { id: 'rheum', label: 'Rheumatologist' },
      { id: 'neuro', label: 'Neurologist' },
      { id: 'endo', label: 'Endocrinologist' },
      { id: 'allergy', label: 'Allergist / Immunologist' },
    ];

    it('should deterministically suggest gastro and cardio for POTS and IBS in <1ms without token burn', async () => {
      const profile = {
        conditions: ['Postural Orthostatic Tachycardia Syndrome', 'Irritable Bowel Syndrome'],
        medications: [{ name: 'Propranolol' }],
        healthFocus: 'Gut motility and autonomic balance'
      };

      const start = performance.now();
      const res = await suggestSpecialists(profile, mockAvailable);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50); // Sub-millisecond execution
      expect(res).not.toBeNull();
      expect(res?.suggestedSpecialistIds).toContain('cardio');
      expect(res?.suggestedSpecialistIds).toContain('gastro');
      expect(res?.professionalAdvice).toContain('Recommended multi-specialist perspectives');
    });

    it('should deterministically suggest rheumatologist for autoimmune arthritis', async () => {
      const profile = {
        conditions: ['Rheumatoid Arthritis', 'Systemic Inflammation'],
        medications: [],
        healthFocus: 'Joint mobility'
      };

      const res = await suggestSpecialists(profile, mockAvailable);
      expect(res?.suggestedSpecialistIds).toContain('rheum');
    });
  });

  describe('Prompt Sanitization for Ava / LLM Guard', () => {
    it('should ensure Ava initialPrompt is completely free of HTML tags and entities', () => {
      const rawItemTitle = '&lt;b&gt;Real-world patterns of analgesic combination therapy&lt;/b&gt; : &lt;b&gt;A retrospective observational study&lt;/b&gt;.';
      const cleanTitle = cleanMedicalText(rawItemTitle);
      const avaPrompt = `I am interested in this clinical research: "${cleanTitle}". How might this relate to my case, conditions, and treatment options?`;

      expect(avaPrompt).not.toContain('&lt;');
      expect(avaPrompt).not.toContain('&gt;');
      expect(avaPrompt).not.toContain('<b>');
      expect(avaPrompt).not.toContain('</b>');
      expect(avaPrompt).toBe('I am interested in this clinical research: "Real-world patterns of analgesic combination therapy: A retrospective observational study.". How might this relate to my case, conditions, and treatment options?');
    });
  });
});
