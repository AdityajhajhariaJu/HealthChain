import re

file_path = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the articles section
pattern = r"\{\/\* Articles for You \*\/\}.*?</section>"
match = re.search(pattern, content, re.DOTALL)

if match:
    old_block = match.group(0)
    
    new_block = '''{/* Articles for You */}
        <section style={{ padding: '32px 0 100px' }}>
          <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#2E2B5F', letterSpacing: '-0.3px' }}>Articles for you</h2>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, cursor: 'pointer' }}>View all</span>
          </div>
          
          <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '16px', padding: '0 24px 24px 24px', WebkitOverflowScrolling: 'touch', margin: 0 }}>
            {[
              { 
                title: 'Overcome Overthinking - 10 Simple Tips from a Therapist', 
                img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&q=80',
                isPopular: true
              },
              { 
                title: 'WANT TO GAIN MUSCLE? THE 6 MOST IMPORTANT RULES', 
                img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=80',
                isPopular: true
              }
            ].map((art, i) => (
              <div key={i} onClick={() => triggerHapticLight()} style={{ 
                width: '260px', 
                minWidth: '260px', 
                background: '#FFFFFF', 
                borderRadius: '16px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                cursor: 'pointer' 
              }}>
                {/* Image Section */}
                <div style={{ position: 'relative', height: '150px', width: '100%' }}>
                  <img loading="lazy" decoding="async" src={art.img} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Badge */}
                  {art.isPopular && (
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(255,255,255,0.85)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#2E2B5F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Flame size={8} color="#FFF" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#2E2B5F' }}>Popular</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', backdropFilter: 'blur(4px)', padding: 0 }}>
                      <Heart size={16} strokeWidth={1.5} />
                    </button>
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', backdropFilter: 'blur(4px)', padding: 0 }}>
                      <Share2 size={16} strokeWidth={1.5} />
                    </button>
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', backdropFilter: 'blur(4px)', padding: 0 }}>
                      <Bookmark size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Text Section */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#2E2B5F', lineHeight: '1.4' }}>
                    {art.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>'''
    
    new_content = content.replace(old_block, new_block)
    
    # Check imports
    if 'Share2' not in new_content:
        lucide_pattern = r"import \{([^}]+)\} from 'lucide-react';"
        lucide_match = re.search(lucide_pattern, new_content)
        if lucide_match:
            imports = lucide_match.group(1)
            new_imports = imports + ', Share2, Bookmark, Flame'
            new_lucide_import = f"import {{{new_imports}}} from 'lucide-react';"
            new_content = new_content.replace(lucide_match.group(0), new_lucide_import)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Updated Articles section')
else:
    print('Failed to find Articles block')
