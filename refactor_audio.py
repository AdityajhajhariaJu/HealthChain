import sys

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_mindfulness = -1
for i, line in enumerate(lines):
    if '{/* The Mindfulness Library */}' in line:
        start_mindfulness = i
        break

start_soundscapes = -1
for i in range(start_mindfulness, len(lines)):
    if '{/* Soundscapes */}' in lines[i]:
        start_soundscapes = i
        break

if start_mindfulness == -1 or start_soundscapes == -1:
    print('Could not find sections')
    sys.exit(1)

new_audio_by_mood = """          {/* Audio by Mood */}
          <section>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Audio by Mood</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Curated experiences to shift your state</p>
            </div>
            <div className="hide-scrollbar scroll-snap-x" style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
              {[
                { title: 'Deep Sleep', img: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80' },
                { title: 'Deep Focus', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80' },
                { title: 'Pure Relax', img: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&q=80' },
                { title: 'Morning Energy', img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80' }
              ].map((item, i) => (
                <div key={i} onClick={() => triggerHapticLight()} className="active-scale scroll-snap-item" style={{ flexShrink: 0, position: 'relative', width: '220px', height: '120px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img loading="lazy" decoding="async" src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, transparent 90%)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, maxWidth: '100px' }}>{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

"""

lines = lines[:start_mindfulness] + [new_audio_by_mood] + lines[start_soundscapes:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Updated Audio by Mood')
