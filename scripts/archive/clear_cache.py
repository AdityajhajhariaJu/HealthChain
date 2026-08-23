import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will add cache clearing to beginCaseCorrelation
clear_cache_code = """    const beginCaseCorrelation = useCallback(() => {
      // Clear session storage to ensure AI doesn't load a cached conversation
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('hc_stream_')) sessionStorage.removeItem(key);
        });
      } catch(e) {}
"""

if "const beginCaseCorrelation = useCallback(() => {" in content:
    content = content.replace("const beginCaseCorrelation = useCallback(() => {", clear_cache_code)

# Add cache clearing to handleReviewPastMDT
clear_cache_code2 = """  const handleReviewPastMDT = (caseItem: any) => {
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('hc_stream_')) sessionStorage.removeItem(key);
      });
    } catch(e) {}
    setActiveCase(caseItem);
    setPhase('dashboard');
  };"""

if "const handleReviewPastMDT = (caseItem: any) => {" in content:
    content = re.sub(r"const handleReviewPastMDT = \(caseItem: any\) => \{[\s\S]*?setPhase\('dashboard'\);\n  \};", clear_cache_code2, content)

# Add cache clearing to handleIntakeComplete
clear_cache_code3 = """    const handleIntakeComplete = async (data: any) => {
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('hc_stream_')) sessionStorage.removeItem(key);
        });
      } catch(e) {}"""

if "const handleIntakeComplete = async (data: any) => {" in content:
    content = content.replace("const handleIntakeComplete = async (data: any) => {", clear_cache_code3)


with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
