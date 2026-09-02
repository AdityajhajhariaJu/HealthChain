import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Soundscapes section styling and heading colors
target = """          {/* Soundscapes */}
          <section style={{
            marginBottom: '0',
            padding: '24px 0 16px',
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%), url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#FFFFFF', letterSpacing: '-0.5px' }}>Soundscapes</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>Immersive audio environments</p>
            </div>"""

replacement = """          {/* Soundscapes */}
          <section style={{
            marginBottom: '0',
            padding: '8px 0 16px'
          }}>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Soundscapes</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Immersive audio environments</p>
            </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Removed purple background from Soundscapes and fixed text colors")
else:
    print("Target block not found, let's investigate")
