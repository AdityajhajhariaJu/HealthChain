import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_use_effect = """  useEffect(() => {
    try {
      // Migrate to using the central CaseEngine for case history instead of legacy hc_history
      const cases = getCases().filter((c: any) => c.reviews && c.reviews.length > 0);
      
      // Also merge legacy hc_history if any, just in case
      const stored = localStorage.getItem('hc_history');
      let legacyCases = [];
      if (stored) {
         legacyCases = JSON.parse(stored);
      }
      
      // Merge, giving preference to CaseEngine cases
      setHistoryCases([...cases, ...legacyCases.filter((lc: any) => !cases.some((c: any) => c.id === lc.id))]);
    } catch (e) {}
  }, []);"""

new_use_effect = """  useEffect(() => {
    try {
      // Only display cases from the central CaseEngine that have actually been completed
      const cases = getCases().filter((c: any) => c.reviews && c.reviews.length > 0);
      setHistoryCases(cases);
    } catch (e) {}
  }, []);"""

content = content.replace(old_use_effect, new_use_effect)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
