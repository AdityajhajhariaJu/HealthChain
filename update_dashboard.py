import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove colored filters from Mindfulness Library
content = content.replace('linear-gradient(to right, rgba(29, 78, 216, 0.8) 0%, rgba(30, 58, 138, 0.1) 100%)', 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 80%)')
content = content.replace('linear-gradient(to right, rgba(16, 185, 129, 0.8) 0%, rgba(4, 120, 87, 0.1) 100%)', 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 80%)')
content = content.replace('linear-gradient(to right, rgba(239, 68, 68, 0.8) 0%, rgba(185, 28, 28, 0.1) 100%)', 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 80%)')

# 2. Replace the gaming grid with a single collective card
# Find the start of the gaming grid section
grid_start = content.find("<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>")
grid_end = content.find("</section>", grid_start) # find the end of the Specialty & Gaming section

if grid_start != -1 and grid_end != -1:
    collective_card = """<div style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative', height: '180px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)' }}>
                  <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" alt="Mindful Play" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                    <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', marginBottom: 'auto', overflowX: 'auto', paddingBottom: '4px' }}>
                      <button onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setActiveCollection({title: "Activity Games", items: specialtyContent.filter(s => s.category_id === categories.find(c => c.slug === "hand-eye")?.id) || []}); }} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}><Gamepad2 size={16} /> Activity Games</button>
                      <button onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setActiveCollection({title: "Hand-Eye Coordination", items: specialtyContent.filter(s => s.category_id === categories.find(c => c.slug === "hand-eye")?.id) || []}); }} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}><Crosshair size={16} /> Coordination</button>
                    </div>
                    <div>
                      <h3 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>Mindful Play</h3>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '4px 0 0' }}>Engage your senses with relaxing interactive games.</p>
                    </div>
                  </div>
                </div>
              """
    
    # We replace the entire grid div and its contents up to the closing section tag.
    # Actually, let's just replace from grid_start to just before </section>
    
    new_content = content[:grid_start] + collective_card + content[grid_end:]
    content = new_content

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated CaseDashboard filters and gaming card')
