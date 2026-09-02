import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add isHydrated state
old_state = "const [showResetDietConfirm, setShowResetDietConfirm] = useState(false);"
new_state = """const [showResetDietConfirm, setShowResetDietConfirm] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);"""
content = content.replace(old_state, new_state)

# Set isHydrated to true when load is finished
old_load = """      void load();
      return () => { cancelled = true; };"""
new_load = """      load().finally(() => setIsHydrated(true));
      return () => { cancelled = true; };"""
content = content.replace(old_load, new_load)

# Prevent saving if not hydrated
old_save = """  // Save state to local storage when it changes
  useEffect(() => {
    try {"""
new_save = """  // Save state to local storage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    try {"""
content = content.replace(old_save, new_save)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed persistence wipe bug")
