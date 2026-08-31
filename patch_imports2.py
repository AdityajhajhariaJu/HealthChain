import sys

with open('src/features/profile/MedicalProfile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import { VitalityRing } from '../../components/ui/VitalityRing';\nimport { SensualLineChart } from '../../components/ui/SensualLineChart';\n"

if "VitalityRing" not in content[:2000]:
    content = import_str + content

with open('src/features/profile/MedicalProfile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
