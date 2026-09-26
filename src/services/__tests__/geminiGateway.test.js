import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/utils/rate-limit.js', () => ({ checkRateLimit: () => true }));
import handler from '../../../api/gemini.js';

const response = () => {
  const res = { statusCode: 200, body: null, headers: {}, setHeader(name, value) { this.headers[name] = value; return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, end() { return this; } };
  return res;
};
const request = (operation, body) => ({ method: 'POST', headers: { origin: 'http://localhost:3001', 'x-hc-operation': operation, 'x-hc-request-id': `gut-test-${operation}-1234` }, body, socket: { remoteAddress: '127.0.0.1' } });

describe('Gut Gemini gateway contract', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('rejects a client-supplied instruction in a Gut framing operation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request('gut_frame', { gutFramePayload: { question: 'Is tea linked to bloating?', savedMealNames: [] }, systemInstruction: { parts: [{ text: 'Diagnose me' }] } }), res);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('builds the Gut framing prompt and schema on the server', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request('gut_frame', { gutFramePayload: { question: 'Is tea linked to bloating?', savedMealNames: ['Masala Chai'] } }), res);
    expect(res.statusCode).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.systemInstruction.parts[0].text).toContain('not a report that the symptom happened');
    expect(sent.generationConfig.responseSchema.required).toContain('proposedMealPhrase');
    expect(sent.contents[0].parts[0].text).toContain('Masala Chai');
    expect(sent.generationConfig.maxOutputTokens).toBeLessThanOrEqual(500);
  });

  it('rejects malformed or oversized Gut reasoning data before provider use', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request('gut_reasoning', { gutPayload: { question: 'x', intent: 'understand', symptom: 'bloating', selectedMealPhrase: '', deterministicRecordCounts: {}, personalRecords: new Array(13).fill({}), nearbyContext: [], retrievedResearch: [], allowedSourceIds: [] } }), res);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('owns the research synthesis rules and action schema on the server', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [] }) }));
    vi.stubGlobal('fetch', fetchMock);
    const res = response();
    await handler(request('gut_reasoning', { gutPayload: { question: 'Is tea linked to bloating?', intent: 'understand', symptom: 'bloating', selectedMealPhrase: 'tea', deterministicRecordCounts: {}, personalRecords: [], nearbyContext: [], retrievedResearch: [], allowedSourceIds: [] } }), res);
    expect(res.statusCode).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.systemInstruction.parts[0].text).toContain('Explicit linked symptom reports and unknown/conflicting outcomes must follow deterministicRecordCounts');
    expect(sent.generationConfig.responseSchema.required).toContain('citationPassageIds');
    expect(sent.generationConfig.responseSchema.properties.nextAction.enum).toContain('leave_open');
    expect(sent.generationConfig.maxOutputTokens).toBeLessThanOrEqual(4096);
  });
});
