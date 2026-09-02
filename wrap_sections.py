import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target_wrapper = """<div style={{ paddingTop: "12px" }}>"""
replacement_wrapper = """<div style={{ 
          margin: '0 16px 40px', 
          paddingTop: '24px', 
          background: 'rgba(255, 255, 255, 0.4)', 
          backdropFilter: 'blur(30px)', 
          WebkitBackdropFilter: 'blur(30px)', 
          border: '1px solid rgba(255, 255, 255, 0.8)', 
          borderRadius: '32px', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 2px 0 rgba(255,255,255,0.7)', 
          overflow: 'hidden' 
        }}>"""
content = content.replace(target_wrapper, replacement_wrapper)

target_soundscapes = """          {/* Soundscapes */}
          <section style={{
            marginBottom: '40px',
            padding: '16px 0 8px',"""
replacement_soundscapes = """          {/* Soundscapes */}
          <section style={{
            marginBottom: '0',
            padding: '24px 0 16px',"""
content = content.replace(target_soundscapes, replacement_soundscapes)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Wrapped sections in heavy glass card")
