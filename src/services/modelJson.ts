function sanitizeJsonString(str: string): string {
  return str.replace(/,\s*([}\]])/g, '$1');
}

/** Parse the first complete JSON value without greedy regex extraction. */
export function parseModelJson<T = any>(raw: string, fallback: T | null = null): T | null {
  if (!raw || typeof raw !== 'string') return fallback;
  const text = raw.replace(/```(?:json|javascript|js)?/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(text) as T; } catch {
    try { return JSON.parse(sanitizeJsonString(text)) as T; } catch {}
  }
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{' && text[start] !== '[') continue;
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack[stack.length - 1] !== char) break;
        stack.pop();
      }
      if (stack.length === 0) {
        const slice = text.slice(start, i + 1);
        try { return JSON.parse(slice) as T; } catch {
          try { return JSON.parse(sanitizeJsonString(slice)) as T; } catch { break; }
        }
      }
    }
  }
  return fallback;
}
