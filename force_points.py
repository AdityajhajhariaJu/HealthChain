with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if skip:
        if '</button>' in line and '{currentTierBadge}' in lines[i-1]:
            skip = False
        continue

    if '<button' in line and 'className="mobile-top-bar__points"' in lines[i+1]:
        skip = True
        new_lines.append('''                    <button
                      className="mobile-top-bar__points sparkly-gold-pill"
                      onClick={() => {
                        triggerHapticLight();
                        window.dispatchEvent(new Event('hc_open_points_modal'));
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '5px 9px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        borderRadius: '20px',
                      }}
                      aria-label="View Vitality Points & Daily Rewards"
                    >
                      <Trophy size={14} color="#FFFFFF" fill="#FDE047" />
                      <span style={{ fontWeight: 900, color: '#FFFFFF' }}>{points} PTS</span>
                      <span style={{ fontSize: '13px', lineHeight: 1 }}>{currentTierBadge}</span>
                    </button>
''')
        continue
    new_lines.append(line)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("done")
