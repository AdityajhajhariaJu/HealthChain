import sys

with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { ChevronRight", "import { ImmersiveFeatureFeed } from './ImmersiveFeatureFeed';\nimport { ChevronRight")

start_idx = content.find('  return (\n      <div style={{')
if start_idx == -1:
    print('Failed to find start_idx')
    sys.exit(1)

new_render = '''  return (
    <div style={{
      width: '100%',
      backgroundColor: '#020617', // Deep slate for glassmorphism pop
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <ImmersiveFeatureFeed />
      
      <div style={{ display: 'none' }}>
        <div style={{
          width: '100%',
          backgroundColor: '#FBF9F6',
'''

content = content[:start_idx] + new_render + content[start_idx + 19:]

end_idx = content.rfind('  );\n}')
if end_idx == -1:
    print('Failed to find end_idx')
    sys.exit(1)

content = content[:end_idx] + '      </div>\n    </div>\n' + content[end_idx:]

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
