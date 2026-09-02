import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """          {/* Soundscapes */}
          <section>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Soundscapes</h2>
            </div>"""

replacement = """          {/* Soundscapes */}
          <section style={{
            margin: '0 16px 40px',
            padding: '24px 0',
            borderRadius: '24px',
            backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.4), rgba(15,23,42,0.8)), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#FFFFFF', letterSpacing: '-0.5px' }}>Soundscapes</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Immersive audio environments</p>
            </div>"""

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Soundscapes with purple gradient background")
