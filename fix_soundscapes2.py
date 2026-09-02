import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """          {/* Soundscapes */}
          <section style={{
            margin: '0 16px 40px',
            padding: '24px 0',
            borderRadius: '24px',
            backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.4), rgba(15,23,42,0.8)), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>"""

replacement = """          {/* Soundscapes */}
          <section style={{
            marginBottom: '40px',
            padding: '40px 0 32px',
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>"""

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Soundscapes background to be full bleed and vibrant")
