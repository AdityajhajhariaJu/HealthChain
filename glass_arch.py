import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Health Canvas bento tile completely
old_canvas = r"""              \{/\* The War Room Bento Tile \(Massive Vertical Card\) \*/\}
              <div 
                onClick=\{.*?\} 
                style=\{\{ 
                  gridRow: 'span 2', 
                  background: 'url\(https://images\.unsplash\.com/photo-1618005182384-a83a8bd57fbe\?q=80&w=600\) center/cover', 
                  borderRadius: '32px', 
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 16px 32px rgba\(139, 92, 246, 0\.15\)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '24px',
                  minHeight: '220px'
                \}\}
              >
                <div style=\{\{ position: 'absolute', inset: 0, background: 'linear-gradient\(to bottom, rgba\(0,0,0,0\.1\) 0%, rgba\(0,0,0,0\.9\) 100%\)' \}\} />
                
                <div style=\{\{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' \}\}>
                  <div style=\{\{ background: 'rgba\(255,255,255,0\.15\)', backdropFilter: 'blur\(12px\)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba\(255,255,255,0\.2\)' \}\}>
                     <div style=\{\{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981', animation: 'pulse 2s infinite' \}\} />
                     <span style=\{\{ fontSize: '10px', fontWeight: 800, color: '#FFF', letterSpacing: '0\.5px' \}\}>LIVE</span>
                  </div>
                  <div style=\{\{ background: 'rgba\(255,255,255,0\.15\)', padding: '8px', borderRadius: '50%', backdropFilter: 'blur\(12px\)', border: '1px solid rgba\(255,255,255,0\.2\)', display: 'flex', alignItems: 'center', justifyContent: 'center' \}\}>
                     <ChevronRight size=\{16\} color="#FFF" />
                  </div>
                </div>
                
                <div style=\{\{ position: 'relative', zIndex: 1 \}\}>
                   <h3 style=\{\{ fontSize: '24px', fontWeight: 800, color: '#FFF', margin: '0 0 4px', lineHeight: 1\.1, letterSpacing: '-0\.5px' \}\}>Health<br/>Canvas</h3>
                   <p style=\{\{ fontSize: '13px', color: 'rgba\(255,255,255,0\.8\)', margin: 0, fontWeight: 500 \}\}>Multi-agent sync</p>
                </div>
              </div>"""

new_canvas = r"""              {/* The Glassmorphic Arch Canvas Tile */}
              <div 
                onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
                style={{ 
                  gridRow: 'span 2',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 100%)',
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
                  <div style={{ width: 2, height: 80, background: 'linear-gradient(to bottom, rgba(170,140,44,0.2) 0%, rgba(170,140,44,0.8) 100%)' }} />
                  <div style={{ width: 24, height: 36, borderRadius: '12px', background: 'rgba(255,255,255,0.8)', border: '2px solid #AA8C2C', boxShadow: '0 4px 12px rgba(170,140,44,0.3)', display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: 12, height: 16, borderRadius: '6px', background: '#AA8C2C', boxShadow: '0 0 8px #AA8C2C' }} />
                  </div>
                </div>
                
                <div style={{ position: 'relative', zIndex: 1, marginTop: '80px', textAlign: 'center' }}>
                   <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#334155', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>Health<br/>Canvas</h3>
                   <p style={{ fontSize: '11px', color: '#64748B', margin: 0, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>DR. JENKINS</p>
                </div>
              </div>"""

if re.search(old_canvas, content):
    content = re.sub(old_canvas, new_canvas, content)
    print("Health Canvas successfully transformed to a glassmorphic arch.")
else:
    print("Could not match the old canvas regex.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
