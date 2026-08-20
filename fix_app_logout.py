with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { initCaseEngine, backfillCaseHealthMemory }", "import { initCaseEngine, clearCaseEngineCache, backfillCaseHealthMemory }")
content = content.replace("window.dispatchEvent(new Event('hc_logout'));", "window.dispatchEvent(new Event('hc_logout'));\n          clearCaseEngineCache();")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
