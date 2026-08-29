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
for i, line in enumerate(lines):
    if "const [deleteConfirmation, setDeleteConfirmation] = useState('');" in line:
        new_lines.append(line)
        new_lines.append("  const [hapticsEnabled, setHapticsEnabled] = useState(localStorage.getItem('hc_haptics_enabled') !== 'false');\n")
        continue

    new_lines.append(line)
    
    # We will inject the haptics block immediately after the dark-theme closing tags
    if "boxShadow: '0 2px 4px rgba(0,0,0,0.1)'," in line:
        # The next lines are }}, />, </div>, </label>, </div>. We inject after that last </div>.
        pass
    if "</div>" in line and "</label>" in lines[i-1] and "</div>" in lines[i-2] and "/>" in lines[i-3] and "}}" in lines[i-4]:
        # Let's verify we are in the dark mode block by checking lines[i-11] or so.
        # Safer check:
        context = "".join(lines[i-15:i])
        if "dark-theme" in context:
            new_lines.append(haptics_block)

with open('src/features/profile/Settings.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Safely injected Haptics toggle")
