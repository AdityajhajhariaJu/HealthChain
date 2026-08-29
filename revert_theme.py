import os

# 1. Update SwimlaneCarousel to use dark text
carousel_path = 'src/components/ui/SwimlaneCarousel.tsx'
with open(carousel_path, 'r', encoding='utf-8') as f:
    carousel_code = f.read()
    
carousel_code = carousel_code.replace("color: '#9ca3af'", "color: '#64748b'")
carousel_code = carousel_code.replace("color: 'white'", "color: '#0F172A'")

with open(carousel_path, 'w', encoding='utf-8') as f:
    f.write(carousel_code)


# 2. Update CaseDashboard to restore the hero section and remove dark mode
dash_path = 'src/features/dashboard/CaseDashboard.tsx'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_code = f.read()

# Make sure Sparkles and Stethoscope are imported
if "import { Play, Lock, Flame" in dash_code:
    dash_code = dash_code.replace("import { Play, Lock, Flame } from 'lucide-react';", "import { Play, Lock, Flame, Sparkles, Stethoscope } from 'lucide-react';")

# Fix wrapper
old_wrapper = "style={{ minHeight: '100vh', backgroundColor: 'black', color: 'white', paddingBottom: '128px', paddingTop: '64px', fontFamily: 'sans-serif' }}"
new_wrapper = "style={{ minHeight: '100vh', paddingBottom: '128px', paddingTop: '16px', fontFamily: 'sans-serif', maxWidth: 1120, margin: '0 auto' }}"
dash_code = dash_code.replace(old_wrapper, new_wrapper)

# Replace the "Today" header block with the Hero card
header_block = """      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 4px' }}>Today</h1>
        <p style={{ color: '#9ca3af', fontWeight: 500, margin: 0 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>"""

hero_block = """      <div style={{ padding: '0 16px' }}>
        <section
          style={{
            borderRadius: 28,
            padding: isMobile ? '26px 24px' : '38px',
            color: '#fff',
            background: 'linear-gradient(135deg, #0f172a, #153d45 65%, #059669)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(15,23,42,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            marginBottom: '32px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#99f6e4', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: isMobile ? 12 : 16 }}>
            <Sparkles size={15} /> Your health command centre
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: isMobile ? 18 : 24, flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 38, letterSpacing: -1.2, lineHeight: 1.1 }}>
                Good to see you{profile?.demographics?.name ? ', ' + (profile.demographics.name.split(' ')[0] || 'User') : '.'}
              </h1>
              <p style={{ color: '#cbd5e1', lineHeight: 1.5, maxWidth: 620, margin: '12px 0 0', fontSize: isMobile ? 14 : 16 }}>
                Start with parallel AI specialist perspectives, then bring their findings into a Deep Collaborative Specialist review for consensus when your case needs deeper correlation.
              </p>
            </div>
            <button onClick={() => navigate('/app/consult?new=true')} style={{ background: '#fff', color: '#0f172a', padding: isMobile ? '12px 16px' : '14px 20px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '16px' }}>
              <Stethoscope size={18} /> Start Quick Consult
            </button>
          </div>
        </section>
      </div>"""

dash_code = dash_code.replace(header_block, hero_block)

# Fix activity types cards for light background (add borders/shadows)
dash_code = dash_code.replace("backgroundColor: 'white', borderRadius: '24px'", "backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0,0,0,0.05)'")

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash_code)

print("Applied Light Theme Revert and Hero Card Restoration!")
