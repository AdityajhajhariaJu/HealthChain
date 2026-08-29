with open('src/features/profile/Settings.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

haptics_block = '''
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
                checked={hapticsEnabled}
                onChange={(e) => {
                  const isEnabled = e.target.checked;
                  if (isEnabled) {
                    try { localStorage.removeItem('hc_haptics_enabled'); } catch(e) {}
                    setHapticsEnabled(true);
                  } else {
                    try { localStorage.setItem('hc_haptics_enabled', 'false'); } catch(e) {}
                    setHapticsEnabled(false);
                  }
                }}
              />
              <div
                style={{
                  width: '44px',
                  height: '24px',
                  background: hapticsEnabled ? '#10B981' : '#E2E8F0',
                  borderRadius: '999px',
                  position: 'relative',
                  transition: 'background 0.3s ease',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    background: '#FFF',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: hapticsEnabled ? '22px' : '2px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                />
              </div>
            </label>
          </div>
'''

new_lines = []
inject_countdown = -1
for i, line in enumerate(lines):
    new_lines.append(line)
    if "High-contrast radiology theme." in line:
        inject_countdown = 27 # roughly the number of lines to the end of the block

    if inject_countdown > 0:
        inject_countdown -= 1
        if inject_countdown == 0:
            new_lines.append(haptics_block)

with open('src/features/profile/Settings.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Injected via countdown")
