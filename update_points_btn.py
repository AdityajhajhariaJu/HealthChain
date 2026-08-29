import re

with open('src/components/layout/AppShell.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_button = '''                    <button
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
                    </button>'''

new_button = '''                    <button
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
                    </button>'''

content = content.replace(old_button, new_button)

with open('src/components/layout/AppShell.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Points button to use sparkly class")
