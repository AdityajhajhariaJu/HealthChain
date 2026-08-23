import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"const cleanTranscripts: Record<string, string> = \{\};\n\s*Object\.keys\(specialistTranscripts\)\.forEach\(\(specId\) => \{\n\s*const specName = selectedSpecialists\.find\(\(s: any\) => s\.id === specId\)\?\.label \|\| specId;\n\s*cleanTranscripts\[specName\] = specialistTranscripts\[specId\]\n\s*\?\.map\(\(m: any\) => `\$\{m\.role\}: \$\{m\.text\}`\)\n\s*\.join\('\\n'\) \|\| '';\n\s*\}\);\n\n\s*// Run backend synthesis\n\s*const conferenceData = await runMDTConference\(intakeData, cleanTranscripts, activeCase\?\.medicalRecords \|\| \[\]\);"

replacement = """const namedTranscripts: Record<string, any[]> = {};
          Object.keys(specialistTranscripts).forEach((specId) => {
            const specName = selectedSpecialists.find((s: any) => s.id === specId)?.label || specId;
            namedTranscripts[specName] = specialistTranscripts[specId] || [];
          });

          // Run backend synthesis
          const conferenceData = await runMDTConference(intakeData, namedTranscripts, activeCase?.medicalRecords || []);"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
