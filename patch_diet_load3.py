import re
with open("src/features/dietician/Dietician.tsx", "r", encoding="utf-8") as f:
    content = f.read()

replacement = """    useEffect(() => {
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
          
          const profileKey = getProfileKey();"""

content = re.sub(r"    useEffect\(\(\) => \{\s*let cancelled = false;\s*const load = async \(\) => \{\s*try \{\s*const profileKey = getProfileKey\(\);", replacement, content)

with open("src/features/dietician/Dietician.tsx", "w", encoding="utf-8") as f:
    f.write(content)
