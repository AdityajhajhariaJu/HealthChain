// Transport validation is separate from clinical/nutrition truth and each
// operation's semantic schema. Never mark a blank or truncated result complete.
export function inspectModelOutput(data, expectsJson = false) {
  const candidate = data?.candidates?.[0];
  if (!candidate || (candidate.finishReason && candidate.finishReason !== 'STOP')) return { valid: false, reason: candidate?.finishReason === 'MAX_TOKENS' ? 'truncated_ai_reply' : 'incomplete_ai_reply' };
  const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
  const text = parts.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('').trim();
  if (!text) return { valid: false, reason: 'empty_ai_reply' };
  if (expectsJson) {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') return { valid: false, reason: 'invalid_ai_json' };
    } catch { return { valid: false, reason: 'invalid_ai_json' }; }
  }
  return { valid: true, text };
}
