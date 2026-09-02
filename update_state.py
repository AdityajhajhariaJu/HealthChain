import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianComponents.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_state = r"""      return {
        weight: coreProfile?.weight ? String(coreProfile.weight) : '',
          weightUnit: 'kg',
          heightUnit: 'cm',
        targetWeight: coreProfile?.weight ? String(Math.max(20, Number(coreProfile.weight) - 5)) : '',
        targetDays: '90',
        height: coreProfile?.height ? String(coreProfile.height) : '','""";

new_state = r"""      return {
        weight: coreProfile?.weight ? String(coreProfile.weight) : '',
        weightUnit: 'kg',
        targetWeight: coreProfile?.weight ? String(Math.max(20, Number(coreProfile.weight) - 5)) : '',
        targetDays: '90',
        height: coreProfile?.height ? String(coreProfile.height) : '',
        heightUnit: 'cm',
        heightFt: '',
        heightIn: '','""";

if old_state in content:
    content = content.replace(old_state, new_state)
else:
    # Use regex
    content = re.sub(
        r"weight: coreProfile\?.weight \? String\(coreProfile\.weight\) : '',.*?height: coreProfile\?.height \? String\(coreProfile\.height\) : '',",
        r"weight: coreProfile?.weight ? String(coreProfile.weight) : '',\n        weightUnit: 'kg',\n        targetWeight: coreProfile?.weight ? String(Math.max(20, Number(coreProfile.weight) - 5)) : '',\n        targetDays: '90',\n        height: coreProfile?.height ? String(coreProfile.height) : '',\n        heightUnit: 'cm',\n        heightFt: '',\n        heightIn: '',",
        content,
        flags=re.DOTALL
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated state.")
