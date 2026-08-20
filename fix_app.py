with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('syncCasesFromSupabase', 'initCaseEngine')

# We need to make sure `initCaseEngine()` is awaited if it's called inside an async function.
content = content.replace('initCaseEngine();', 'await initCaseEngine();')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# We also need to export clearCaseEngineCache in CaseEngine.ts
with open('src/services/CaseEngine.ts', 'r', encoding='utf-8') as f:
    case_content = f.read()

case_content += "\nexport function clearCaseEngineCache() {\n  cachedCases = null;\n}\n"

with open('src/services/CaseEngine.ts', 'w', encoding='utf-8') as f:
    f.write(case_content)
