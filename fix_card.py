import os

filepath = 'C:/Users/adity/OneDrive/Desktop/HealthChain-Live/src/features/dashboard/CaseDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Header fix
old_header = """            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 21 }}>Active cases</h2>
                <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Reopen a case as reports, appointments, or symptoms evolve.
                </p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/multi')}>
                <Plus size={15} /> Parallel review
              </button>
            </div>"""

new_header = """            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? 12 : 0,
                marginBottom: 14,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 21 }}>Active cases</h2>
                <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Reopen a case as reports, appointments, or symptoms evolve.
                </p>
              </div>
              <button className="btn btn-outline btn-sm" style={{ width: isMobile ? '100%' : 'auto' }} onClick={() => navigate('/app/multi')}>
                <Plus size={15} /> Parallel review
              </button>
            </div>"""

content = content.replace(old_header, new_header)

old_card = """function CaseCard({ item, navigate }: { item: CaseItem, navigate: any }) {
  const pending = item.actions.filter((a) => a.status !== 'completed').length;
  const primary = item.currentSummary?.topDiagnoses?.[0];
  return (
    <article
      className="card"
      style={{
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          display: 'grid',
          placeItems: 'center',
          background: '#ecfdf5',
          color: '#059669',
        }}
      >
        <Archive size={21} />
      </div>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <strong>{item.title}</strong>
          <span className="badge badge-navy">
             {item.currentStage.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <p style={{ margin: '5px 0', color: '#64748b', fontSize: 13 }}>
          {primary?.condition
            ? `Leading pathway: ${primary.condition}`
            : 'Awaiting evidence synthesis'}
        </p>
        <small style={{ color: '#94a3b8' }}>
          <CalendarClock size={12} style={{ verticalAlign: 'middle' }} /> Updated{' '}
          {formatDate(item.updatedAt)} · {pending} actions open
        </small>
      </div>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          setActiveCase(item.id);
          navigate(`/app/cases/${item.id}`);
        }}
      >
        Open case
      </button>
    </article>
  );
}"""

new_card = """function CaseCard({ item, navigate }: { item: CaseItem, navigate: any }) {
  const pending = item.actions.filter((a) => a.status !== 'completed').length;
  const primary = item.currentSummary?.topDiagnoses?.[0];
  const isMobile = useIsMobile();
  return (
    <article
      className="card"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 16,
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            display: 'grid',
            placeItems: 'center',
            background: '#ecfdf5',
            color: '#059669',
            flexShrink: 0,
          }}
        >
          <Archive size={21} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <strong style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.title}</strong>
            <span className="badge badge-navy" style={{ flexShrink: 0 }}>
               {item.currentStage.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p style={{ margin: '5px 0', color: '#64748b', fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {primary?.condition
              ? `Leading pathway: ${primary.condition}`
              : 'Awaiting evidence synthesis'}
          </p>
          <small style={{ color: '#94a3b8', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            <CalendarClock size={12} style={{ verticalAlign: 'middle' }} /> Updated{' '}
            {formatDate(item.updatedAt)} · {pending} actions open
          </small>
        </div>
      </div>
      <button
        className="btn btn-primary btn-sm"
        style={{ width: isMobile ? '100%' : 'auto', flexShrink: 0 }}
        onClick={() => {
          setActiveCase(item.id);
          navigate(`/app/cases/${item.id}`);
        }}
      >
        Open case
      </button>
    </article>
  );
}"""

# handle weird unicode character near actions open
old_card_alt = old_card.replace("·", "A")
content = content.replace(old_card, new_card)
content = content.replace(old_card_alt, new_card)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed CaseDashboard.tsx')
