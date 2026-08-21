/** Parse the first complete JSON value without greedy regex extraction. */
export function parseModelJson<T = any>(raw: string, fallback: T | null = null): T | null {
  if (!raw) return fallback;
  const text = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(text) as T; } catch {}
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
        try { return JSON.parse(text.slice(start, i + 1)) as T; } catch { break; }
      }
    }
  }
  return fallback;
}
