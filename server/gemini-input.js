const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));

function validPart(part, textOnly = false) {
  if (!object(part) || Object.keys(part).length !== 1) return false;
  if (typeof part.text === 'string') return true;
  if (textOnly) return false;
  // Existing photo callers use snake case; document callers use camel case.
  const snakeCase = Object.hasOwn(part, 'inline_data');
  const data = snakeCase ? part.inline_data : part.inlineData;
  const mimeKey = snakeCase ? 'mime_type' : 'mimeType';
  return only(data, [mimeKey, 'data']) && typeof data.data === 'string' &&
    data.data.length > 0 && typeof data[mimeKey] === 'string' &&
    (data[mimeKey] === 'application/pdf' || /^image\/[a-z0-9.+-]+$/i.test(data[mimeKey]));
}

function validContent(content, textOnly = false) {
  return only(content, ['role', 'parts']) &&
    (content.role === undefined || (textOnly ? content.role === 'system' : ['user', 'model'].includes(content.role))) &&
    Array.isArray(content.parts) && content.parts.length > 0 &&
    content.parts.every(part => validPart(part, textOnly));
}

// Keep the gateway within the reviewed text/photo/PDF data flow. Reject remote
// files, caches, grounding/tools and caller overrides instead of forwarding them
// with different processor destinations or retention behavior.
export function validGeminiInput(payload) {
  if (!only(payload, ['contents', 'systemInstruction', 'generationConfig']) ||
    !Array.isArray(payload.contents) || payload.contents.length === 0 ||
    !payload.contents.every(content => validContent(content))) return false;
  if (payload.systemInstruction !== undefined && !validContent(payload.systemInstruction, true)) return false;
  const config = payload.generationConfig;
  if (config === undefined) return true;
  if (!only(config, ['temperature', 'maxOutputTokens', 'responseMimeType', 'responseSchema', 'thinkingConfig'])) return false;
  if (config.temperature !== undefined && (!Number.isFinite(config.temperature) || config.temperature < 0 || config.temperature > 2)) return false;
  if (config.maxOutputTokens !== undefined && (!Number.isSafeInteger(config.maxOutputTokens) || config.maxOutputTokens < 1)) return false;
  if (config.responseMimeType !== undefined && !['text/plain', 'application/json'].includes(config.responseMimeType)) return false;
  if (config.responseSchema !== undefined && !object(config.responseSchema)) return false;
  if (config.thinkingConfig !== undefined && (!only(config.thinkingConfig, ['thinkingBudget']) ||
    !Number.isSafeInteger(config.thinkingConfig.thinkingBudget) || config.thinkingConfig.thinkingBudget < -1)) return false;
  return true;
}
