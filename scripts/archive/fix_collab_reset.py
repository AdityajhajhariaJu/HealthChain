import re

with open('src/features/mdt/MDTHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the "Start New Case" button inside phase === 'done' to reset the store properly
new_btn = """                  <button 
                    onClick={() => {
                      resetMDTStore();
                      setGlobalActiveCase(null);
                      setHistoryReport(null);
                      setMedicalRecords([]);
                    }}"""
old_btn = r'<\s*button\s+onClick=\{\(\) => navigate\(\'/app/collab\'\)\}'
content = re.sub(old_btn, new_btn, content)


# 2. Add a mount effect to auto-reset if they return to the page while it's in the 'done' state
mount_effect = """  useEffect(() => {
    // If the user navigates away after finishing a case and returns later via the sidebar,
    // automatically reset so they see a fresh intake page instead of being stuck on the 'done' screen.
    if (useMDTStore.getState().phase === 'done') {
      resetMDTStore();
      setGlobalActiveCase(null);
      setHistoryReport(null);
      setMedicalRecords([]);
    }
  }, []); // Empty dependency array ensures this ONLY runs on component mount
"""

# Insert it before the other useEffects
pattern_insert = r'(const fileInputRef = React\.useRef<any>\(null\);\s*)'
content = re.sub(pattern_insert, r'\1\n' + mount_effect, content)

with open('src/features/mdt/MDTHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
