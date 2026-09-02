import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "{/* The War Room Bento Tile (Massive Vertical Card) */}"
end_marker = "{/* Task Bento Tiles */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    
    new_canvas = r"""{/* The Glassmorphic Arch Canvas Tile */}
              <div 
                onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
                style={{ 
                  gridRow: 'span 2',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 100%)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  borderRadius: '160px 160px 32px 32px', 
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 0 20px rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  minHeight: '260px'
                }}
              >
                {/* Brass Pendant Light */}
                <div style={{ position: 'absolute', top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 2, height: 80, background: 'linear-gradient(to bottom, rgba(170,140,44,0.3) 0%, rgba(170,140,44,0.9) 100%)' }} />
                  <div style={{ width: 24, height: 36, borderRadius: '12px', background: 'rgba(255,255,255,0.9)', border: '2px solid #AA8C2C', boxShadow: '0 8px 16px rgba(170,140,44,0.2)', display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: 12, height: 16, borderRadius: '6px', background: '#AA8C2C', boxShadow: '0 0 8px #AA8C2C' }} />
                  </div>
                </div>
                
                <div style={{ position: 'relative', zIndex: 1, marginTop: '80px', textAlign: 'center' }}>
                   <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#334155', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>Health<br/>Canvas</h3>
                   <p style={{ fontSize: '11px', color: '#64748B', margin: 0, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>DR. JENKINS</p>
                </div>
              </div>

              """
              
    content = content[:start_idx] + new_canvas + content[end_idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Markers not found.")
