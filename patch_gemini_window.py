with open("src/services/geminiService.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const requestId = idempotencyKey || await sha256Hash(options.body || Date.now().toString());", """  // Create an idempotency key that expires every 5 minutes.
  // This prevents double-clicks and page-refresh quota burns, but allows
  // genuine retries later if the user gets stuck or the UI drops the response.
  const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000));
  const requestId = idempotencyKey || await sha256Hash((options.body || '') + timeWindow.toString());""")

with open("src/services/geminiService.ts", "w", encoding="utf-8") as f:
    f.write(content)
