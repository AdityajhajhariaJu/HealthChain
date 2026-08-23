with open("src/services/CaseEngine.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if "cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);" in line:
        new_lines.append("         // Fix: Always persist the remote snapshot locally so offline-mode has a durable fallback!\n")
        new_lines.append("         setItemSync(key, JSON.stringify(cachedCases));\n")
    if "await flushSyncOutbox(session.user.id);" in line and "Keep localStorage as a read-only safety net" in "".join(lines[i:i+3]):
        new_lines.append("      // Fix: Keep localStorage updated immediately as a read-only safety net for offline recovery!\n")
        new_lines.append("      setItemSync(currentCasesKey || getCasesKey(), JSON.stringify(safeCases.filter((c: any) => (c.__profileId || 'profile_1') === currentProfileId)));\n")

with open("src/services/CaseEngine.ts", "w", encoding="utf-8") as f:
    f.write("".join(new_lines))
