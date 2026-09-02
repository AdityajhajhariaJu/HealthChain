import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str = "{showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}"
replace_str = """{showARLens && <ARGroceryLens 
          onClose={() => setShowARLens(false)} 
          onLogFood={(food) => {
            triggerHapticSuccess();
            const updatedLogs = { ...foodLogs };
            updatedLogs[currentDate] = updatedLogs[currentDate] ? [...updatedLogs[currentDate]] : [];
            updatedLogs[currentDate].push({
              ...food,
              id: Date.now() + Math.random(),
            });
            setFoodLogs(updatedLogs);
            setShowARLens(false);
            awardPoints(5, 'AI Food Scanned & Logged', 'lifestyle', r_scan_);
          }} 
        />}"""

content = content.replace(find_str, replace_str)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dietician.tsx")
