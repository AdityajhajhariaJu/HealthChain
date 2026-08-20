import json

with open('src/services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_json = """  "urgency": "Routine | Soon | Urgent",
  "topDiagnoses": ["""

new_json = """  "specialistDebatePoints": ["Bullet points outlining agreements or differing perspectives among the specialists", "Leave empty if none"],
  "systemicCorrelations": ["Bullet points explaining how symptoms connect across different body systems", "Leave empty if none"],
  "urgency": "Routine | Soon | Urgent",
  "topDiagnoses": ["""

content = content.replace(old_json, new_json)

# Update schema
old_schema = """          abnormalitiesNoted: { type: "array", items: { type: "string" } },
          medicalTerms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } } } },
          urgency: { type: "string" },"""

new_schema = """          abnormalitiesNoted: { type: "array", items: { type: "string" } },
          medicalTerms: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } } } },
          specialistDebatePoints: { type: "array", items: { type: "string" } },
          systemicCorrelations: { type: "array", items: { type: "string" } },
          urgency: { type: "string" },"""

content = content.replace(old_schema, new_schema)

old_req = 'required: ["executiveSummary", "keyFindings", "interpretation", "nextSteps", "abnormalitiesNoted", "medicalTerms", "topDiagnoses", "recommendedActionPlan"]'
new_req = 'required: ["executiveSummary", "keyFindings", "interpretation", "nextSteps", "abnormalitiesNoted", "medicalTerms", "specialistDebatePoints", "systemicCorrelations", "topDiagnoses", "recommendedActionPlan"]'

content = content.replace(old_req, new_req)

with open('src/services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
