import re

with open('src/features/dashboard/CaseDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Care momentum block
old_momentum = '''<section className="card" style={{ padding: isMobile ? '16px 14px' : '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: isMobile ? '18px' : '22px' }}>
          <div>
            <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#10B981', alignItems: 'center' }}>
              <Activity size={isMobile ? 16 : 19} />
              <strong style={{ fontSize: isMobile ? '13px' : '15px' }}>Care momentum</strong>
            </div>
            <div style={{ fontSize: isMobile ? 28 : 38, fontWeight: 850, marginTop: isMobile ? 10 : 16, color: '#0F172A' }}>{completed}</div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: isMobile ? 11 : 13, lineHeight: 1.3 }}>
              case actions completed
            </p>
          </div>
        </section>'''

new_momentum = '''<section className="card" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: isMobile ? '20px' : '24px' }}>
          <div>
            <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#10B981', alignItems: 'center' }}>
              <Activity size={isMobile ? 18 : 20} />
              <strong style={{ fontSize: isMobile ? '14px' : '16px' }}>Care momentum</strong>
            </div>
            <div style={{ fontSize: isMobile ? 32 : 40, fontWeight: 850, marginTop: isMobile ? 10 : 16, color: '#0F172A' }}>{completed}</div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: isMobile ? 12 : 14, lineHeight: 1.3 }}>
              case actions completed
            </p>
          </div>
        </section>'''
content = content.replace(old_momentum, new_momentum)

# Replace Health record block
content = content.replace(
    '''<section className="card" style={{ padding: isMobile ? '16px 14px' : '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: isMobile ? '18px' : '22px' }}>''',
    '''<section className="card" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: isMobile ? '20px' : '24px' }}>'''
)
content = content.replace("fontSize: isMobile ? '13px' : '15px'", "fontSize: isMobile ? '14px' : '16px'")
content = content.replace("padding: isMobile ? '6px 2px' : '10px 6px',", "padding: isMobile ? '8px 4px' : '10px 8px',")
content = content.replace("fontSize: isMobile ? 14 : 18", "fontSize: isMobile ? 16 : 20")
content = content.replace("fontSize: isMobile ? 8 : 10", "fontSize: isMobile ? 10 : 12")

content = content.replace("padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? '11px' : '13px',", "padding: '8px 12px', fontSize: isMobile ? '13px' : '14px',")

with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
