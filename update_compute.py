import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianComponents.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update computeTargets to handle unit conversion
old_compute = r"""function computeTargets(p: any) {
  const parsedWeight = parseFloat(p.weight);
  const w = Math.max(20, !Number.isNaN(parsedWeight) ? parsedWeight : 70);

  const parsedHeight = parseFloat(p.height);
  const h = Math.max(50, !Number.isNaN(parsedHeight) ? parsedHeight : 170);"""

new_compute = r"""function computeTargets(p: any) {
  let parsedWeight = parseFloat(p.weight);
  if (p.weightUnit === 'lbs') parsedWeight = parsedWeight * 0.453592;
  const w = Math.max(20, !Number.isNaN(parsedWeight) ? parsedWeight : 70);

  let parsedHeight = parseFloat(p.height);
  if (p.heightUnit === 'ft') {
    const ft = parseFloat(p.heightFt) || 0;
    const inc = parseFloat(p.heightIn) || 0;
    parsedHeight = (ft * 30.48) + (inc * 2.54);
  }
  const h = Math.max(50, !Number.isNaN(parsedHeight) ? parsedHeight : 170);"""

content = content.replace(old_compute, new_compute)

old_target = r"""    if (!Number.isNaN(parsedDays) && parsedDays > 0 && p.goal !== 'Maintain') {
      const parsedTargetW = parseFloat(p.targetWeight);
      const targetW = !Number.isNaN(parsedTargetW) ? parsedTargetW : w;"""

new_target = r"""    if (!Number.isNaN(parsedDays) && parsedDays > 0 && p.goal !== 'Maintain') {
      let parsedTargetW = parseFloat(p.targetWeight);
      if (p.weightUnit === 'lbs') parsedTargetW = parsedTargetW * 0.453592;
      const targetW = !Number.isNaN(parsedTargetW) ? parsedTargetW : w;"""

content = content.replace(old_target, new_target)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated computeTargets.")
