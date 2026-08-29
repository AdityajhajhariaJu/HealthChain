import os

filepath = 'src/components/layout/AppShell.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Rename 'Dietician' to 'Diet Plan' in navItems
content = content.replace(
    "{ to: '/app/dietician', label: 'Dietician', icon: Apple }",
    "{ to: '/app/dietician', label: 'Diet Plan', icon: Apple }"
)

# 2. Rename 'Pharmacy Hub' to 'Medicine Hub' in navItems
content = content.replace(
    "{ to: '/app/pharmacy', label: 'Pharmacy Hub', icon: Pill }",
    "{ to: '/app/pharmacy', label: 'Medicine Hub', icon: Pill }"
)

# 3. Update mobileTabs array
old_mobile_tabs = """const mobileTabs = [
  { to: '/app/today', label: 'Today', icon: LayoutDashboard },
  { to: '/app/consult', label: 'Consult', icon: Stethoscope },
  { to: '/app/jarvis', label: 'JARVIS', icon: Brain },
  { to: '/app/my-cases', label: 'Cases', icon: Archive },
];"""

new_mobile_tabs = """const mobileTabs = [
  { to: '/app/today', label: 'Today', icon: LayoutDashboard },
  { to: '/app/consult', label: 'Consult', icon: Stethoscope },
  { to: '/app/jarvis', label: 'JARVIS', icon: Brain },
  { to: '/app/ava', label: 'Ava', icon: Heart },
  { to: '/app/dietician', label: 'Diet', icon: Apple },
  { to: '/app/my-cases', label: 'Cases', icon: Archive },
];"""

content = content.replace(old_mobile_tabs, new_mobile_tabs)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated labels and mobile tabs")
