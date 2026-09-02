import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add onClick to ChevronLeft
find_btn = """                  <button
                    style={{
                      padding: '8px 12px',
                      background: '#FFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>"""
replace_btn = """                  <button
                    onClick={() => {
                      const d = parseLocalDate(currentDate);
                      d.setDate(d.getDate() - 1);
                      setCurrentDate(formatLocalDate(d));
                    }}
                    style={{
                      padding: '8px 12px',
                      background: '#FFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>"""

if find_btn in content:
    content = content.replace(find_btn, replace_btn)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed ChevronLeft button in Dietician.tsx")
else:
    print("Could not find ChevronLeft button string")
