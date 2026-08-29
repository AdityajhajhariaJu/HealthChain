import os

filepath = 'src/features/dashboard/CaseDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the import
content = content.replace("import { ActiveCaseBar } from '../../components/layout/AppShell';\n", "")

# Remove the component block
block_to_remove = """
      <div style={{ padding: '0 16px', marginBottom: '32px' }}>
        <ActiveCaseBar navigate={navigate} />
      </div>
"""
content = content.replace(block_to_remove, "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed ActiveCaseBar")
