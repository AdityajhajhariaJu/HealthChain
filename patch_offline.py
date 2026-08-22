import re

with open("src/services/CaseEngine.ts", "r", encoding="utf-8") as f:
    content = f.read()

replacement = """      if (!error && data) {
         // Filter by profile
         cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);
         
         // Fix: Always persist the remote snapshot locally so offline-mode has a durable fallback!
         setItemSync(key, JSON.stringify(cachedCases));
      } else if (localRaw) {"""

content = content.replace("      if (!error && data) {\n         // Filter by profile\n         cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);\n      } else if (localRaw) {", replacement)

# Also fix the `save` function to write to localStorage even when logged in!
save_replacement = """         });
      }
      await flushSyncOutbox(session.user.id);
      
      // Fix: Keep localStorage updated immediately as a read-only safety net for offline recovery!
      setItemSync(getCasesKey(), JSON.stringify(safeCases.filter((c: any) => (c.__profileId || 'profile_1') === currentProfileId)));
    } else {"""
content = content.replace("         });\n      }\n      await flushSyncOutbox(session.user.id);\n      // Keep localStorage as a read-only safety net for offline/poor-network scenarios.\n      // It will be refreshed on next successful initCaseEngine read from Supabase.\n    } else {", save_replacement)

with open("src/services/CaseEngine.ts", "w", encoding="utf-8") as f:
    f.write(content)
