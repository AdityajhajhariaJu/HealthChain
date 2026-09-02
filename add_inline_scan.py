import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

find_str = """                  <button
                    onClick={() => setIsLoggingFood(true)}"""

replace_str = """                  <button
                    onClick={() => { triggerHapticLight(); setShowARLens(true); }}
                    style={{
                      background: '#FFF',
                      color: '#0F172A',
                      border: '1px solid #E2E8F0',
                      padding: '11px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <Scan size={20} color="#10B981" />
                  </button>
                  <button
                    onClick={() => setIsLoggingFood(true)}"""

content = content.replace(find_str, replace_str)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added inline Scan button.")
