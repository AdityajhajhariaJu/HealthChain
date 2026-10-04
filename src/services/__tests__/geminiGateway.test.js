import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../server/rate-limit.js', () => ({ checkRateLimit: () => true }));
import handler from '../../../api/gemini.js';

const response = () => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
};
const request = (operation, body) => ({
  method: 'POST',
  headers: {
    origin: 'http://localhost:3001',
    'x-hc-ai-consent': '2026-10-04',
    'x-hc-operation': operation,
    'x-hc-request-id': `gut-test-${operation}-1234`,
  },
  body,
  socket: { remoteAddress: '127.0.0.1' },
});

describe('Gut Gemini gateway contract', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it.each([undefined, 'old'])('rejects missing or outdated AI permission %s before contacting Google', async version => {
    const provider = vi.fn(); vi.stubGlobal('fetch', provider);
    const req = request('gemini', { contents: [{ parts: [{ text: 'Synthetic' }] }] });
    req.headers['x-hc-ai-consent'] = version;
    const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(428);
    expect(provider).not.toHaveBeenCalled();
  });
  it('rejects an unrelated Vercel origin before provider use', async () => {
    const provider = vi.fn(); vi.stubGlobal('fetch', provider);
    const req = request('gemini', { contents: [{ parts: [{ text: 'Synthetic' }] }] });
    req.headers.origin = 'https://unrelated-project.vercel.app';
    const res = response(); await handler(req, res);
    expect(res.statusCode).toBe(403); expect(provider).not.toHaveBeenCalled();
  });

  it('accepts a bounded Clinical attachment that exceeds the ordinary text request limit', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: 'STOP',
            content: { parts: [{ text: '{"executiveSummary":"Check the supplied record."}' }] },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Review the attached clinical document.' },
            { inlineData: { mimeType: 'application/pdf', data: 'A'.repeat(300000) } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    };
    await handler(request('jarvis_investigation', payload), res);
    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body).contents[0].parts[1].inlineData.data.length
    ).toBe(300000);
  });

  it('rejects Clinical requests above the document budget before provider use', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      request('jarvis_investigation', {
        contents: [
          { parts: [{ inlineData: { mimeType: 'application/pdf', data: 'A'.repeat(4194304) } }] },
        ],
      }),
      res
    );
    expect(res.statusCode).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a client-supplied instruction in a Gut framing operation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      request('gut_frame', {
        gutFramePayload: { question: 'Is tea linked to bloating?', savedMealNames: [] },
        systemInstruction: { parts: [{ text: 'Diagnose me' }] },
      }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds the Gut framing prompt and schema on the server', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: '{"proposedSymptom":"bloating","proposedMealPhrase":"Masala Chai","researchTopic":"caffeine","researchConcept":"tea","oneClarification":""}',
                },
              ],
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      request('gut_frame', {
        gutFramePayload: {
          question: 'Is tea linked to bloating?',
          savedMealNames: ['Masala Chai'],
        },
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.systemInstruction.parts[0].text).toContain(
      'not a report that the symptom happened'
    );
    expect(sent.generationConfig.responseSchema.required).toContain('proposedMealPhrase');
    expect(sent.contents[0].parts[0].text).toContain('Masala Chai');
    expect(sent.generationConfig.maxOutputTokens).toBeLessThanOrEqual(500);
  });

  it('rejects malformed or oversized Gut reasoning data before provider use', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      request('gut_reasoning', {
        gutPayload: {
          question: 'x',
          intent: 'understand',
          symptom: 'bloating',
          selectedMealPhrase: '',
          deterministicRecordCounts: {},
          personalRecords: new Array(13).fill({}),
          nearbyContext: [],
          retrievedResearch: [],
          allowedSourceIds: [],
        },
      }),
      res
    );
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('owns the research synthesis rules and action schema on the server', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: '{"summary":"No saved personal evidence was supplied.","nextAction":"leave_open","citationPassageIds":[]}',
                },
              ],
            },
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      request('gut_reasoning', {
        gutPayload: {
          question: 'Is tea linked to bloating?',
          intent: 'understand',
          symptom: 'bloating',
          selectedMealPhrase: 'tea',
          deterministicRecordCounts: {},
          personalRecords: [],
          nearbyContext: [],
          retrievedResearch: [],
          allowedSourceIds: [],
        },
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.systemInstruction.parts[0].text).toContain(
      'Explicit linked symptom reports and unknown/conflicting outcomes must follow deterministicRecordCounts'
    );
    expect(sent.generationConfig.responseSchema.required).toContain('citationPassageIds');
    expect(sent.generationConfig.responseSchema.properties.nextAction.enum).toContain('leave_open');
    expect(sent.generationConfig.maxOutputTokens).toBeLessThanOrEqual(4096);
  });

  it('rejects an unsigned meal plan request before invoking the provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(
      request('dietician_meal_plan', {
        contents: [{ parts: [{ text: 'Generate a plan' }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      res
    );
    expect(res.statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not complete a Gut request with blank or truncated provider output', async () => {
    for (const provider of [
      { candidates: [] },
      {
        candidates: [
          { finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"partial":true}' }] } },
        ],
      },
    ]) {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, json: async () => provider }))
      );
      const res = response();
      await handler(
        request('gut_frame', {
          gutFramePayload: { question: 'Is tea linked to bloating?', savedMealNames: [] },
        }),
        res
      );
      expect(res.statusCode).toBe(502);
      expect(res.body.requestState).toBe('failed');
    }
  });
});
