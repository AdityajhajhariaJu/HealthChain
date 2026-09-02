import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the glass container actually transparent and add a background blob behind it
old_glass = """      {/* 2. Main Budget Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '32px',
          padding: '36px 24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
          display: 'grid',"""

new_glass = """      {/* 2. Main Budget Card */}
        <div style={{ position: 'relative' }}>
          {/* Aesthetic background blobs so the glassmorphism has something to blur! */}
          <div style={{ position: 'absolute', top: '10%', left: '10%', width: '120px', height: '120px', background: '#A7F3D0', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '150px', height: '150px', background: '#DBEAFE', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '40%', right: '30%', width: '100px', height: '100px', background: '#FDE68A', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }} />
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.25)', // Heavy glassmorphism transparency
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '32px',
            padding: '36px 24px',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.8)',
            display: 'grid',
            position: 'relative',
            zIndex: 1,"""

content = content.replace(old_glass, new_glass)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added blobs and heavy glassmorphism to macro rings container")
