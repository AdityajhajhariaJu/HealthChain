with open('src/components/ui/CaseConnectionMap.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_rect = """                <motion.rect x="-70" y="-25" width="140" height="50" rx="12" fill={bgColor} stroke={color} strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: isActive && hoveredNode === node.id ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
                <text y="-5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0F172A">{node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label}</text>
                <text y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{node.confidence}% | {node.specialty}</text>
                {hasPrecaution && (
                  <motion.g transform="translate(55, -25)" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <circle r="10" fill="#EF4444" />
                    <foreignObject x="-7" y="-7" width="14" height="14">
                      <AlertTriangle size={14} color="#FFF" />
                    </foreignObject>
                  </motion.g>
                )}"""

new_rect = """                <motion.rect x="-85" y="-25" width="170" height="50" rx="12" fill={bgColor} stroke={color} strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: isActive && hoveredNode === node.id ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
                <text y="-5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0F172A">{node.label.length > 22 ? node.label.substring(0, 20) + '...' : node.label}</text>
                <text y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{node.confidence}% | {node.specialty}</text>
                {hasPrecaution && (
                  <motion.g transform="translate(70, -25)" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <circle r="10" fill="#EF4444" />
                    <foreignObject x="-7" y="-7" width="14" height="14">
                      <AlertTriangle size={14} color="#FFF" />
                    </foreignObject>
                  </motion.g>
                )}"""

content = content.replace(old_rect, new_rect)

old_missing = """          {data.missingEvidence?.length > 0 && (
            <div style={{ padding: '16px', background: '#ECFDF5', borderRadius: '16px', border: '1px solid #A7F3D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, marginBottom: '12px' }}><HelpCircle size={18} /> Missing Evidence</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#065F46', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.missingEvidence.map((m: any, i: number) => (
                  <li key={i}><strong>{m.test}</strong> <span style={{ opacity: 0.7 }}>(Urgency: {m.urgency})</span></li>
                ))}
              </ul>
            </div>
          )}"""

new_missing = """          {data.missingEvidence?.length > 0 && (
            <div style={{ padding: '16px', background: '#ECFDF5', borderRadius: '16px', border: '1px solid #A7F3D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, marginBottom: '12px' }}><Stethoscope size={18} /> Discuss these with a Doctor</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#065F46', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.missingEvidence.map((m: any, i: number) => (
                  <li key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{m.test}</strong>
                      <span style={{ fontSize: '12px', padding: '2px 6px', background: 'rgba(4, 120, 87, 0.1)', borderRadius: '4px', fontWeight: 600 }}>{m.urgency}</span>
                    </div>
                    {m.recommendedSpecialists && (
                      <div style={{ fontSize: '13px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85 }}>
                        <Users size={12} /> Seek: {m.recommendedSpecialists}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}"""

content = content.replace(old_missing, new_missing)

with open('src/components/ui/CaseConnectionMap.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
