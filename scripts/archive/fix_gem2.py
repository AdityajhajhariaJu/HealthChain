import re
with open("src/services/geminiService.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Replace any multiple identical declarations with a single one
content = re.sub(r"(?:\s*const idempotencyKey = await sha256Hash\('mdt-' \+ requestKey\);){2,}", r"\n    const idempotencyKey = await sha256Hash('mdt-' + requestKey);", content)

with open("src/services/geminiService.ts", "w", encoding="utf-8") as f:
    f.write(content)
