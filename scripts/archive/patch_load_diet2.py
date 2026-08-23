import re

with open("src/features/dietician/Dietician.tsx", "r", encoding="utf-8") as f:
    content = f.read()

load_func = """    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const coreProfile = getCoreProfile();
          if (coreProfile?.dietician) {
            const { profile: p, foodLogs: fl, hydration: h, mealPlan: mp, advice: a } = coreProfile.dietician;
            if (p) setProfile({ ...p, ...calculateTargets(p) });
            if (fl) setFoodLogs(fl);
            if (h) setHydration(h);
            if (mp) setMealPlan(mp);
            if (a) setAdvice(a);
            return;
          }
          
          const profileKey = getProfileKey();
          const savedProfile = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile'));"""

content = re.sub(r"    useEffect\(\(\) => \{\n      let cancelled = false;\n      const load = async \(\) => \{\n        try \{\n          const profileKey = getProfileKey\(\);\n          const savedProfile = localStorage\.getItem\(profileKey\.replace\('hc_unified_profile', 'hc_diet_profile'\)\);", load_func, content)

with open("src/features/dietician/Dietician.tsx", "w", encoding="utf-8") as f:
    f.write(content)
