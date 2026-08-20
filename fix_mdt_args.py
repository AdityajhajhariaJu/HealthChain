import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_call = """      const report = await generateMDTReport(intakeData, conferenceData, activeCase?.medicalRecords || []);"""
new_call = """      const report = await generateMDTReport(intakeData, conferenceData, answers, activeCase?.medicalRecords || []);"""

content = content.replace(old_call, new_call)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
