import os, re

filepath = 'src/features/dashboard/CaseDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_hero = """      <div style={{ padding: '0 16px' }}>
        <section
          style={{
            borderRadius: isMobile ? 20 : 24,
            padding: isMobile ? '20px 20px' : '32px',
            color: '#fff',
            background: 'linear-gradient(135deg, #0f172a, #153d45 75%, #059669)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(15,23,42,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#99f6e4', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            <Sparkles size={14} /> Health Command Centre
          </div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24, alignItems: isMobile ? 'stretch' : 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, letterSpacing: -1, lineHeight: 1.15 }}>
                Good to see you{profile?.demographics?.name ? ', ' + (profile.demographics.name.split(' ')[0] || 'User') : '.'}
              </h1>
              <p style={{ color: '#cbd5e1', lineHeight: 1.4, maxWidth: 600, margin: '8px 0 0', fontSize: isMobile ? 13 : 15 }}>
                Start with parallel AI specialist perspectives, then bring their findings into a Deep Collaborative Specialist review for consensus.
              </p>
            </div>
            <button onClick={() => navigate('/app/consult?new=true')} style={{ background: '#fff', color: '#0f172a', padding: '12px 16px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '15px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <Stethoscope size={18} /> Quick Consult
            </button>
          </div>
        </section>
      </div>"""

content = re.sub(r'<div style={{ padding: \'0 16px\' }}>\s*<section.*?<Sparkles.*?</section>\n\s*</div>', new_hero, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully via regex")
