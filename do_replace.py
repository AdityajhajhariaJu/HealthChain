import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the two sections with the 2x2 grid
old_sections = re.search(r'<section>\s*<div style={{ padding: \'0 24px\', marginBottom: \'16px\', display: \'flex\', justifyContent: \'space-between\', alignItems: \'flex-end\' }}>.*?Curated experiences to shift your state</p>\s*</div>\s*<div className="hide-scrollbar scrollable-row" .*?</section>', content, flags=re.DOTALL)

if not old_sections:
    print("Could not find the sections to replace")
else:
    new_section = """<section>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Music by Mood</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Curated experiences to shift your state</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', padding: '0 24px 16px' }}>
              {[
                { 
                  id: 'm1', 
                  title: 'Full Meditation', 
                  subtitle: 'Immersive audio journey',
                  img: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80',
                  description: 'Our most complete meditation experience.'
                },
                {
                  id: 'mood-0',
                  title: 'Deep Sleep',
                  subtitle: 'Restorative slumber',
                  img: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80',
                  description: 'A guided progression into delta-wave sleep.'
                },
                {
                  id: 'mood-1',
                  title: 'Deep Focus',
                  subtitle: 'Intense concentration',
                  img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
                  description: 'Designed for deep work.'
                },
                {
                  id: 'mood-2',
                  title: 'Morning Energy',
                  subtitle: 'Start with clarity',
                  img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80',
                  description: 'An energizing morning protocol.'
                }
              ].map((item, i) => (
                <div key={i} onClick={() => {
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
                </div>
              ))}
            </div>
          </section>"""
    
    content = content[:old_sections.start()] + new_section + content[old_sections.end():]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced sections with 2x2 matrix")

