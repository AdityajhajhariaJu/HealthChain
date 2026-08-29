new_layout_lines = '''    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#99f6e4',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: isMobile ? 12 : 16,
          }}
        >
          <Sparkles size={15} /> Your health command centre
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: isMobile ? 18 : 24,
            flexWrap: 'wrap',
            alignItems: 'end',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 38, letterSpacing: -1.2, lineHeight: 1.1 }}>
              Good to see you
              {profile?.demographics?.name ? ', ' + profile.demographics.name : ''}.
            </h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5, maxWidth: 620, margin: '12px 0 0', fontSize: isMobile ? 14 : 16 }}>
              Start with parallel AI specialist perspectives, then bring their findings into a Deep
              Collaborative Specialist review for consensus when your case needs deeper correlation.
            </p>
          </div>
          <button
            className="btn"
            onClick={() => navigate('/app/consult?new=true')}
            style={{ background: '#fff', color: '#0f172a', padding: isMobile ? '12px 16px' : '14px 20px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center', borderRadius: 99 }}
          >
            <Stethoscope size={18} /> Start Quick Consult
          </button>
        </div>
      </section>

      {/* 2. Active Case Full Width Bento */}
      <div>
        <ActiveCaseBar navigate={navigate} />
      </div>

      {/* 3. The Core Bento Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)',
          gap: 16,
          alignItems: 'stretch',
        }}
      >
        {/* Row 1: Daily Checkin (8 cols) + Mindful HRV (4 cols) */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 8', display: 'flex', flexDirection: 'column' }}>
          <DailySymptomCheckinWidget />
        </div>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 4', display: 'flex', flexDirection: 'column' }}>
          <MindfulHRVCard />
        </div>

        {/* Row 2: Vitality (8 cols) + Pro Upgrade (4 cols) */}
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 8', display: 'flex', flexDirection: 'column' }}>
          <VitalityPlayground />
        </div>
        <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 4', display: 'flex', flexDirection: 'column' }}>
          <UpgradeToProCard isPro={isPremium} />
        </div>

        {/* Row 3: BioStack Full Width */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
          <LongevityBioStackCard />
        </div>

        {/* Row 4: Momentum & Record */}
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: isMobile ? 4 : 8,
                  margin: isMobile ? '10px 0' : '16px 0',
                }}
              >
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
      </div>\n'''

print("div open:", new_layout_lines.count('<div'))
print("div close:", new_layout_lines.count('</div'))
