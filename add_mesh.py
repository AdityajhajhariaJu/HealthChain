with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the top of the general dashboard return block
target = '''  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>'''

replacement = '''  return (
    <div className="aurora-bg" style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="aurora-mesh" />'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added aurora to CaseDashboard")
else:
    print("Target not found in CaseDashboard")
