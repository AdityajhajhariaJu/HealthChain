import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """<div key={i} onClick={() => {
                    triggerHapticLight();
                    setActiveMeditation({
                      id: item.id,
                      category_id: item.id === 'm1' ? 'meditation' : 'mood',
                      is_active: true,
                      type: 'meditation',
                      title: item.title,
                      subtitle: item.subtitle,
                      description: item.description,
                      cover_image_url: item.img,
                      audio_url: '',
                      video_url: '',
                      duration_minutes: item.id === 'mood-0' ? 45 : item.id === 'mood-1' ? 60 : 30,
                      calories_estimate: 0,
                      difficulty: 'Beginner',
                      equipment: [],
                      is_premium: false,
                      is_featured: true
                    });
                  }} className="active-scale" style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.4)', cursor: 'pointer', aspectRatio: '1/1' }}>
                  <img loading="lazy" decoding="async" src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0) 100%)' }} />
                  
                  {/* Glassmorphic info panel */}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '8px', 
                    left: '8px', 
                    right: '8px', 
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)', lineHeight: 1.2 }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.subtitle}</p>
                  </div>
                </div>"""

new_block = """<div key={i} onClick={() => {
                    triggerHapticLight();
                    setActiveMeditation({
                      id: item.id,
                      category_id: item.id === 'm1' ? 'meditation' : 'mood',
                      is_active: true,
                      type: 'meditation',
                      title: item.title,
                      subtitle: item.subtitle,
                      description: item.description,
                      cover_image_url: item.img,
                      audio_url: '',
                      video_url: '',
                      duration_minutes: item.id === 'mood-0' ? 45 : item.id === 'mood-1' ? 60 : 30,
                      calories_estimate: 0,
                      difficulty: 'Beginner',
                      equipment: [],
                      is_premium: false,
                      is_featured: true
                    });
                  }} className="active-scale" style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.08)', aspectRatio: '1/1' }}>
                    <img loading="lazy" decoding="async" src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.subtitle}</p>
                  </div>
                </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Could not find the block to replace")
