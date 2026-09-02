import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """          {/* Soundscapes */}
          <section style={{
            marginBottom: '40px',
            padding: '40px 0 32px',
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>"""

replacement = """          {/* Soundscapes */}
          <section style={{
            marginBottom: '40px',
            padding: '16px 0 8px',
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>"""

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Tightened the vertical padding on Soundscapes background")
