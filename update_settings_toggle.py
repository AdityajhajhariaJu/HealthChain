with open('src/features/profile/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We need to find the Dark Mode block and add the Haptics block right after it.
# The dark mode block ends around:
#                       document.documentElement.classList.remove('dark-theme');
#                       try { localStorage.removeItem('hc_theme'); } catch(e) {}
#                     }
#                   }}
#                 />
#                 <div style={{ width: '44px', height: '24px', background: document.documentElement.classList.contains('dark-theme') ? 'var(--primary)' : 'var(--border)', borderRadius: '24px', position: 'relative', transition: '0.2s' }}>
#                   <div style={{ width: '20px', height: '20px', background: '#FFF', borderRadius: '50%', position: 'absolute', top: '2px', left: document.documentElement.classList.contains('dark-theme') ? '22px' : '2px', transition: '0.2s' }} />
#                 </div>
#               </label>
#             </div>

dark_mode_end = '''              </div>
            </label>
          </div>'''

haptics_block = '''          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: isMobile ? 12 : 0,
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                Haptic Feedback
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Subtle vibrations for a premium tactile feel.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ display: 'none' }}
                checked={localStorage.getItem('hc_haptics_enabled') !== 'false'}
                onChange={(e) => {
                  const isEnabled = e.target.checked;
                  if (isEnabled) {
                    try { localStorage.removeItem('hc_haptics_enabled'); } catch(e) {}
                  } else {
                    try { localStorage.setItem('hc_haptics_enabled', 'false'); } catch(e) {}
                  }
                  // Force a re-render to update the toggle visual immediately
                  window.dispatchEvent(new Event('hc_haptics_toggled'));
                }}
              />
              <div style={{ width: '44px', height: '24px', background: localStorage.getItem('hc_haptics_enabled') !== 'false' ? 'var(--primary)' : 'var(--border)', borderRadius: '24px', position: 'relative', transition: '0.2s' }}>
                <div style={{ width: '20px', height: '20px', background: '#FFF', borderRadius: '50%', position: 'absolute', top: '2px', left: localStorage.getItem('hc_haptics_enabled') !== 'false' ? '22px' : '2px', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
              </div>
            </label>
          </div>'''

content = content.replace(dark_mode_end, haptics_block, 1)

with open('src/features/profile/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Haptics toggle to Settings")
