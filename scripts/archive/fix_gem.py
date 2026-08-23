import re
with open("src/services/geminiService.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const idempotencyKey = await sha256Hash('mdt-' + requestKey);\n    const idempotencyKey = await sha256Hash('mdt-' + requestKey);", "const idempotencyKey = await sha256Hash('mdt-' + requestKey);")

with open("src/services/geminiService.ts", "w", encoding="utf-8") as f:
    f.write(content)
