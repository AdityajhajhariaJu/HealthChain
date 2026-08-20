import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace `const selectedSpecialists = useMDTStore(s => s.selectedSpecialists);`
# with a mapped version

hydrate_code = """  const rawSelectedSpecialists = useMDTStore(s => s.selectedSpecialists);
  const selectedSpecialists = useMemo(() => {
    return rawSelectedSpecialists.map(s => ALL_SPECIALISTS.find(a => a.id === s.id) || s);
  }, [rawSelectedSpecialists]);"""

if "const selectedSpecialists = useMDTStore(s => s.selectedSpecialists);" in content:
    content = content.replace("const selectedSpecialists = useMDTStore(s => s.selectedSpecialists);", hydrate_code)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
