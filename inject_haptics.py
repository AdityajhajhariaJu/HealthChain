with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "import { initCaseEngine, clearCaseEngineCache" in line:
        lines.insert(i, "import { initGlobalHaptics } from './services/haptics';\n")
        break

for i, line in enumerate(lines):
    if "useEffect(() => {" in line:
        # Find the main useEffect inside App component
        # Let's just find the first useEffect that handles setup
        if "setupPushListeners" in "".join(lines[i:i+15]):
            lines.insert(i+1, "    initGlobalHaptics();\n")
            break

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Injected initGlobalHaptics into App.tsx")
