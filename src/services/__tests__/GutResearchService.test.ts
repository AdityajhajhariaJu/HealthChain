import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchGutResearch } from '../GutResearchService';

afterEach(() => vi.unstubAllGlobals());

describe('Gut research metadata boundary', () => {
  it('sends only generic terms, preserves journal and publication type, and excludes retraction notices', async () => {
    const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ resultList: { result: [
      { pmid: '12345', title: 'Diet and bloating', abstractText: 'An abstract.', pubYear: '2025',
        journalInfo: { journal: { title: 'Example Journal' } }, pubTypeList: { pubType: ['Review', 'Journal Article'] } },
      { pmid: '23456', title: 'Withdrawn article', abstractText: 'An abstract.', isRetracted: 'Y' },
      { pmid: '34567', title: 'Retracted by notice', abstractText: 'An abstract.',
        commentCorrectionList: { commentCorrection: [{ type: 'Retracted in' }] } },
      { pmid: '45678', title: 'Correction to a diet and abdominal bloating study', abstractText: 'An abstract.',
        commentCorrectionList: { commentCorrection: [{ type: 'Erratum in' }] } },
      { pmid: '56789', title: 'Sports supplement use in athletes', abstractText: 'Abdominal bloating mentioned.' },
      { pmid: '67890', title: 'Abdominal bloating in adults', abstractText: 'Diet is discussed only in the abstract.' },
    ] } }) }));
    vi.stubGlobal('fetch', fetchMock);
    const papers = await searchGutResearch('bloating');
    expect(papers.map((paper) => paper.id)).toEqual(['12345', '45678']);
    expect(papers[0]).toMatchObject({ journal: 'Example Journal', year: '2025', publicationTypes: ['Review', 'Journal Article'] });
    expect(papers[1].correctionNotice).toBe('Erratum in');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('abdominal+bloating');
    expect(url).not.toContain('chai');
    expect(url).not.toContain('account');
    await searchGutResearch('reflux', 'caffeine');
    const selected = new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('query');
    expect(selected).toContain('gastroesophageal reflux');
    expect(selected).toContain('TITLE:caffeine OR TITLE:coffee OR TITLE:tea');
    expect(selected).not.toContain('chai');
  });

  it('does not fabricate missing publication metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ resultList: { result: [{ pmid: '98765', title: 'Food and nausea study', abstractText: 'Abstract text' }] } }) })));
    const [paper] = await searchGutResearch('nausea');
    expect(paper).toMatchObject({ journal: null, year: null, publicationTypes: [], correctionNotice: null, populationKnown: false });
  });
});
