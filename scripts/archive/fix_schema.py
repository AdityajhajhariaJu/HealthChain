with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_schema = """[
  {
    "id": "uuid1",
    "condition": "Hypothyroidism",
    "probability": 75,
    "trend": "up",
    "supportingEvidence": ["Fatigue", "Weight gain", "Low T4"],
    "refutingEvidence": ["Normal TSH (previously)"],
    "nextBestTests": ["TSH", "Free T4", "Anti-TPO"]
  }
]"""

new_schema = """[
  {
    "id": "uuid1",
    "condition": "Hypothyroidism",
    "definition": "A condition where the thyroid gland doesn't produce enough hormones, causing fatigue and weight gain.",
    "probability": 75,
    "trend": "up",
    "supportingEvidence": ["Fatigue", "Weight gain", "Low T4"],
    "refutingEvidence": ["Normal TSH (previously)"],
    "nextBestTests": ["TSH", "Free T4", "Anti-TPO"]
  }
]"""

content = content.replace(old_schema, new_schema)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
