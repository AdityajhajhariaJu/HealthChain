with open("src/services/CaseEngine.ts", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Use regex with dotall
content = re.sub(r"      if \(!error && data\) \{\s*// Filter by profile\s*cachedCases = data\.map\(row => row\.data\)\.filter\(d => \(d\.__profileId \|\| 'profile_1'\) === currentProfileId\);\s*\} else if \(localRaw\) \{", """      if (!error && data) {
         // Filter by profile
         cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);
         // Fix: Always persist the remote snapshot locally so offline-mode has a durable fallback!
         setItemSync(key, JSON.stringify(cachedCases));
      } else if (localRaw) {""", content)

content = re.sub(r"      await flushSyncOutbox\(session\.user\.id\);\s*// Keep localStorage as a read-only safety net for offline/poor-network scenarios\.\s*// It will be refreshed on next successful initCaseEngine read from Supabase\.\s*\} else \{", """      await flushSyncOutbox(session.user.id);
      // Fix: Keep localStorage updated immediately as a read-only safety net for offline recovery!
      setItemSync(currentCasesKey || getCasesKey(), JSON.stringify(safeCases.filter((c: any) => (c.__profileId || 'profile_1') === getActiveProfileId())));
    } else {""", content)

with open("src/services/CaseEngine.ts", "w", encoding="utf-8") as f:
    f.write(content)
