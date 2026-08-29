with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_ava = False
skip_points = False

for i, line in enumerate(lines):
    if skip_ava:
        if '</button>' in line and 'Ask anything' in lines[i-1]:
            skip_ava = False
            continue
        continue
    
    if skip_points:
        if '</button>' in line and 'currentTierBadge' in lines[i-1]:
            skip_points = False
            continue
        continue

    if '<button className="mobile-top-bar__search"' in line and 'Ask Ava Health Buddy' in line:
        skip_ava = True
        new_lines.append('''              <button className="mobile-top-bar__search" onClick={() => navigate('/app/ava')} aria-label="Search or Ask Ava Health Buddy" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingRight: '6px', borderRight: '1px solid #FFE4E6', color: '#F43F5E' }}>
                  <Heart size={12} fill="#F43F5E" color="#F43F5E" />
                  <span style={{ fontWeight: 800, fontSize: '11px' }}>Ava</span>
                </div>
                <Bot size={14} style={{ color: '#F43F5E', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ask anything...</span>
              </button>
''')
        continue

    if '<button' in line and 'className="mobile-top-bar__points"' in lines[i+1]:
        skip_points = True
        new_lines.append('''                  <button
                    className="mobile-top-bar__points"
                    onClick={() => {
                      triggerHapticLight();
                      window.dispatchEvent(new Event('hc_open_points_modal'));
                    }}
                    style={{
                      cursor: 'pointer',
                      border: '1px solid rgba(253, 230, 138, 0.8)',
                      background: 'linear-gradient(135deg, rgba(253, 230, 138, 0.95) 0%, rgba(245, 158, 11, 0.85) 100%)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.6)',
                      color: '#78350F',
                      padding: '5px 9px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: '20px',
                    }}
                    aria-label="View Vitality Points & Daily Rewards"
                  >
                    <Trophy size={14} color="#92400E" fill="#FDE68A" />
                    <span style={{ fontWeight: 900, textShadow: '0 1px 2px rgba(255,255,255,0.4)' }}>{points} PTS</span>
                    <span style={{ fontSize: '13px', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))' }}>{currentTierBadge}</span>
                  </button>
''')
        continue
        
    new_lines.append(line)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated via line replacement")
