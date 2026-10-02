import { fetchWithTimeout } from './transport';
import { API_URL } from './transport';

export interface Message {
  role: string;
  content?: string | any;
  text?: string;
}

export async function fetchGutQuestionFrame(payload: {
  question: string;
  savedMealNames: string[];
}): Promise<string> {
  const response = await fetchWithTimeout(
    API_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'gut_frame' },
      body: JSON.stringify({ gutFramePayload: payload }),
    },
    25000
  );
  if (!response.ok)
    throw new Error('Question framing is unavailable; you can still review the records yourself.');
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const result = Array.isArray(parts)
    ? parts
        .map((part: { text?: string }) => part.text || '')
        .join('\n')
        .trim()
    : '';
  if (!result) throw new Error('Question framing did not return a suggestion.');
  return result;
}

/** HealthChain's existing authenticated Gemini gateway; no provider key is exposed in the browser. */
export async function fetchGutReasoning(payload: unknown): Promise<string> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      API_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-HC-Operation': 'gut_reasoning' },
        body: JSON.stringify({ gutPayload: payload }),
      },
      55000
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'QUOTA_EXCEEDED')
      throw new Error(
        'Your AI allowance or request limit has been reached. Your question is saved; you can still open its records and research.'
      );
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error('The answer took too long. Your question is saved. Please try again.');
    if (/unauthorized|session expired/i.test(message))
      throw new Error('Sign in again to get an AI answer. Your question is saved.');
    throw error;
  }
  if (!response.ok)
    throw new Error(
      response.status === 402 || response.status === 429
        ? 'Gemini is unavailable for this account right now. Your saved records are unchanged.'
        : 'Gemini could not complete this Gut brief. Your saved records are unchanged.'
    );
  const data = await response.json();
  const candidate = Array.isArray(data?.candidates) ? data.candidates[0] : null;
  const textContent = Array.isArray(candidate?.content?.parts)
    ? candidate.content.parts
        .map((part: { text?: string }) => (typeof part?.text === 'string' ? part.text : ''))
        .join('\n')
        .trim()
    : '';
  if (!textContent)
    throw new Error(
      'Gemini did not return a complete Gut brief. Your saved records are unchanged.'
    );
  return textContent;
}
