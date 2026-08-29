new_layout_lines = '''    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* 1. Hero Full Width Bento */}
      <section>
        <div>
          <Sparkles size={15} /> Your health command centre
        </div>
        <div>
          <div>
            <h1>Good to see you</h1>
            <p>Start with parallel AI specialist perspectives</p>
          </div>
          <button>
            <Stethoscope size={18} /> Start Quick Consult
          </button>
        </div>
      </section>

      {/* 2. Active Case Full Width Bento */}
      <div>
        <ActiveCaseBar navigate={navigate} />
      </div>

      {/* 3. The Core Bento Grid */}
      <div>
        {/* Row 1: Daily Checkin (8 cols) + Mindful HRV (4 cols) */}
        <div>
          <DailySymptomCheckinWidget />
        </div>
        <div>
          <MindfulHRVCard />
        </div>

        {/* Row 2: Vitality (8 cols) + Pro Upgrade (4 cols) */}
        <div>
          <VitalityPlayground />
        </div>
        <div>
          <UpgradeToProCard isPro={isPremium} />
        </div>

        {/* Row 3: BioStack Full Width */}
        <div>
          <LongevityBioStackCard />
        </div>

        {/* Row 4: Momentum & Record */}
        <div>
          <section>
            <div>
              <div>
                <Activity size={isMobile ? 18 : 20} />
                <strong>Care momentum</strong>
              </div>
              <div>{completed}</div>
              <p>
                case actions completed
              </p>
            </div>
          </section>
        </div>

        <div>
          <section>
            <div>
              <div>
                <FileText size={isMobile ? 16 : 19} />
                <strong>Health record</strong>
              </div>
              <div>
                {[1, 2, 3].map((_, i) => (
                  <div key={i} style={{ height: 4, borderRadius: 2, background: i === 0 ? '#0D9488' : 'rgba(13,148,136,0.2)' }} />
                ))}
              </div>
              <p>
                <strong>33%</strong> mapped this year
              </p>
            </div>
          </section>
        </div>
      </div>\n'''

print("div open:", new_layout_lines.count('<div'))
print("div close:", new_layout_lines.count('</div'))
