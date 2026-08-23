import re

with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_schema = """  "missingEvidence": [
    { "test": "Complete Blood Count", "wouldDifferentiate": ["cond1", "cond2"], "urgency": "Routine|Soon" }
  ],"""

new_schema = """  "missingEvidence": [
    { "test": "Complete Blood Count", "wouldDifferentiate": ["cond1", "cond2"], "urgency": "Routine|Soon", "recommendedSpecialists": "General Physician or Hematologist" }
  ],"""

content = content.replace(old_schema, new_schema)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
