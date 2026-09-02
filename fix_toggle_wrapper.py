import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the redundant wrapper around FatigueModeToggle
old_wrapper = """      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '24px', marginTop: '16px' }}>
          <FatigueModeToggle />
        </div>
        
        <div style={{ padding: '0 24px 32px 24px' }}>"""

new_wrapper = """      }}>
        <FatigueModeToggle />
        
        <div style={{ padding: '0 24px 32px 24px' }}>"""

content = content.replace(old_wrapper, new_wrapper)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed redundant toggle wrapper")
