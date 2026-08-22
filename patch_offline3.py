with open("src/services/CaseEngine.ts", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """      if (!error && data) {
         // Filter by profile
         cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);
      } else if (localRaw) {"""

repl1 = """      if (!error && data) {
         // Filter by profile
         cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);
         // Fix: Always persist the remote snapshot locally so offline-mode has a durable fallback!
         setItemSync(key, JSON.stringify(cachedCases));
      } else if (localRaw) {"""

content = content.replace(target1, repl1)

target2 = """      await flushSyncOutbox(session.user.id);
      // Keep localStorage as a read-only safety net for offline/poor-network scenarios.
      // It will be refreshed on next successful initCaseEngine read from Supabase.
    } else {"""

repl2 = """      await flushSyncOutbox(session.user.id);
      // Fix: Keep localStorage updated immediately as a read-only safety net for offline recovery!
      setItemSync(currentCasesKey || getCasesKey(), JSON.stringify(safeCases.filter((c: any) => (c.__profileId || 'profile_1') === getActiveProfileId())));
    } else {"""

content = content.replace(target2, repl2)

with open("src/services/CaseEngine.ts", "w", encoding="utf-8") as f:
    f.write(content)
