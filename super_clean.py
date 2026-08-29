import re

with open('restored.tsx', 'r', encoding='utf-16') as f:
    original = f.read()

# We want to replace from '  // General dashboard (Health Today)' to 'function JarvisCaseWorkspace'
start_idx = original.find('  // General dashboard (Health Today)')
end_idx = original.find('function JarvisCaseWorkspace')

if start_idx != -1 and end_idx != -1:
    new_dashboard_block = '''  // General dashboard (Health Today)
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Hero Full Width Bento */}
      <section
        style={{
          borderRadius: 28,
          padding: isMobile ? '26px 24px' : '38px',
          color: '#fff',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(21,61,69,0.85) 65%, rgba(5,150,105,0.85))',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 32px rgba(15,23,42,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#99f6e4', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: isMobile ? 12 : 16 }}>
          <Sparkles size={15} /> Your health command centre
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: isMobile ? 18 : 24, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 38, letterSpacing: -1.2, lineHeight: 1.1 }}>
              Good to see you
              {profile?.demographics?.name ? ', ' + (profile.demographics.name.split(' ')[0] || 'User') : ''}.
            </h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5, maxWidth: 620, margin: '12px 0 0', fontSize: isMobile ? 14 : 16 }}>
              Start with parallel AI specialist perspectives, then bring their findings into a Deep Collaborative Specialist review for consensus.
            </p>
          </div>
          <button className="btn" onClick={() => navigate('/app/consult?new=true')} style={{ background: '#fff', color: '#0f172a', padding: isMobile ? '12px 16px' : '14px 20px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center', borderRadius: 99 }}>
            <Stethoscope size={18} /> Start Quick Consult
          </button>
        </div>
      </section>

      <div>
        <ActiveCaseBar navigate={navigate} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)', gap: 16, alignItems: 'stretch' }}>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 8', display: 'flex', flexDirection: 'column' }}>
          <DailySymptomCheckinWidget />
        </div>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 4', display: 'flex', flexDirection: 'column' }}>
          <MindfulHRVCard />
        </div>

        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 8', display: 'flex', flexDirection: 'column' }}>
          <VitalityPlayground />
        </div>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 4', display: 'flex', flexDirection: 'column' }}>
          <UpgradeToProCard isPro={isPremium} />
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
          <LongevityBioStackCard />
        </div>

        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 6', display: 'flex', flexDirection: 'column' }}>
          <section className="card bento-card" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 28, flex: 1, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(15,23,42,0.04)' }}>
            <div>
              <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#0D9488', alignItems: 'center' }}>
                <Activity size={isMobile ? 18 : 20} />
                <strong style={{ fontSize: isMobile ? '14px' : '16px' }}>Care momentum</strong>
              </div>
              <div style={{ fontSize: isMobile ? 32 : 40, fontWeight: 850, marginTop: isMobile ? 10 : 16, color: '#0F172A' }}>{completed}</div>
              <p style={{ color: '#475569', margin: 0, fontSize: isMobile ? 12 : 14, lineHeight: 1.3 }}>
                case actions completed
              </p>
            </div>
          </section>
        </div>

        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 6', display: 'flex', flexDirection: 'column' }}>
          <section className="card bento-card" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 28, flex: 1, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(15,23,42,0.04)' }}>
            <div>
              <div style={{ display: 'flex', gap: isMobile ? 6 : 10, color: '#0D9488', alignItems: 'center' }}>
                <FileText size={isMobile ? 16 : 19} />
                <strong style={{ fontSize: isMobile ? '14px' : '16px' }}>Health record</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 4 : 8, margin: isMobile ? '10px 0' : '16px 0' }}>
                {[1, 2, 3].map((_, i) => (
                  <div key={i} style={{ height: 4, borderRadius: 2, background: i === 0 ? '#0D9488' : 'rgba(13,148,136,0.2)' }} />
                ))}
              </div>
              <p style={{ color: '#475569', margin: 0, fontSize: isMobile ? 12 : 14, lineHeight: 1.3 }}>
                <strong>33%</strong> mapped this year
              </p>
            </div>
          </section>
        </div>
      </div>

      {isMobile && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12, fontSize: 12, color: '#64748B' }}>
            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
          </div>
          <div style={{ padding: '14px 18px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', lineHeight: '1.5', color: '#64748B', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <strong style={{ color: '#334155' }}>Disclaimer:</strong> HealthChain is an AI Navigational and Researcher tool, not a doctor. It is not a substitute for professional medical advice.
          </div>
        </div>
      )}
    </div>
  );
}

'''
    # Construct final file
    final = original[:start_idx] + new_dashboard_block + original[end_idx:]
    with open('src/features/dashboard/CaseDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(final)
    print("Replaced whole block safely.")
else:
    print("Could not find start or end index.")
