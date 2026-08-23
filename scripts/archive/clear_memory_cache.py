import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

clear_memory_cache = """  const [completedSpecialists, setCompletedSpecialists] = React.useState<Set<string>>(new Set());

  // Clear memory cache if case changes
  React.useEffect(() => {
    if (activeCase?.id) {
      const lastCaseId = sessionStorage.getItem('hc_mdt_last_case_id');
      if (lastCaseId !== activeCase.id) {
        Object.keys(cachedMDTSpecialistStreams).forEach(k => delete cachedMDTSpecialistStreams[k]);
        sessionStorage.setItem('hc_mdt_last_case_id', activeCase.id);
      }
    }
  }, [activeCase?.id]);"""

if "const [completedSpecialists, setCompletedSpecialists] = React.useState<Set<string>>(new Set());" in content:
    content = content.replace("const [completedSpecialists, setCompletedSpecialists] = React.useState<Set<string>>(new Set());", clear_memory_cache)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
