with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state to MDTIntakePanel
old_state = """export function MDTIntakePanel({
  onStart,
  activeCase,
  onResumeActiveCase,
  parallelCases = [],
  onElevateParallel,
}: any) {
  const isMobile = useIsMobile();
  const [complaint, setComplaint] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const fileInputRef = React.useRef<any>(null);"""

new_state = """export function MDTIntakePanel({
  onStart,
  activeCase,
  onResumeActiveCase,
  parallelCases = [],
  onElevateParallel,
}: any) {
  const isMobile = useIsMobile();
  const [complaint, setComplaint] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [historyCases, setHistoryCases] = useState<any[]>([]);
  const fileInputRef = React.useRef<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('hc_history');
    if (stored) {
      setHistoryCases(JSON.parse(stored));
    }
  }, []);

  const handleImportCase = (pastCase: any) => {
    const previousSummary = pastCase.report?.executiveSummary || pastCase.title || '';
    const previousFindings = pastCase.report?.keyFindings || '';
    
    setComplaint(`[FOLLOW-UP FROM PREVIOUS EVALUATION]
Previous Case Summary: ${previousSummary}
${previousFindings ? `Previous Findings: ${previousFindings}` : ''}

New Information / Changes in Symptoms since last evaluation:
- `);
    setShowImportModal(false);
  };
"""

content = content.replace(old_state, new_state)


# 2. Remove Resume Active Case block
old_resume = """        <div style={{ height: '1px', background: '#E2E8F0', margin: '30px 0' }}></div>

        {/* Resume Active Case */}
        {activeCase && (
          <div 
            onClick={() => onResumeActiveCase && onResumeActiveCase()}
            style={{
              background: 'linear-gradient(135deg, #102A43, #163B57)',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '16px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,.12)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #163B57, #1D4D6C)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #102A43, #163B57)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ background: 'rgba(94,234,212,.16)', color: '#99F6E4', padding: '4px 8px', borderRadius: '20px', fontSize: '10px', letterSpacing: '.6px', fontWeight: 800 }}>ACTIVE CASE</span>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>{activeCase.title}</h2>
              </div>
              <p style={{ color: '#C7DCEB', margin: 0, fontSize: '13px' }}>Continue your existing investigation.</p>
            </div>
            <div style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#5EEAD4', color: '#102A43' }}><ArrowRight size={16} /></div>
          </div>
        )}"""

content = content.replace(old_resume, "")

# 3. Add Import Button
old_btn = """                onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
              >
                <Upload size={12} /> Upload lab reports also
              </button>
              <input
                type="file\""""

new_btn = """                onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
              >
                <Upload size={12} /> Upload lab reports also
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: isMobile ? '160px' : '180px',
                  padding: isMobile ? '4px 10px' : '6px 14px',
                  background: isMobile ? 'rgba(241, 245, 249, 0.6)' : '#F1F5F9',
                  backdropFilter: isMobile ? 'blur(4px)' : 'none',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '999px',
                  fontSize: isMobile ? '11px' : '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#475569'; }}
              >
                <GitMerge size={12} /> Import existing case
              </button>
              <input
                type="file\""""

content = content.replace(old_btn, new_btn)

# 4. Add the Modal UI at the end of MDTIntakePanel
old_return_end = """        {/* Elevate Parallel Case */}
        {parallelCases.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#64748B', marginBottom: '12px' }}>
              Resume a Quick Consult case
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {parallelCases.map(pc => (
                <div
                  key={pc.id}
                  onClick={() => onElevateParallel && onElevateParallel(pc)}
                  style={{
                    padding: '16px',
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFF'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', display: 'grid', placeItems: 'center' }}>
                      <Stethoscope size={16} color="#475569" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{pc.title}</h4>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{pc.date}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#94A3B8" />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}"""

new_return_end = """        {/* Elevate Parallel Case */}
        {parallelCases.length > 0 && (
          <div style={{ marginBottom: '16px', marginTop: '30px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#64748B', marginBottom: '12px' }}>
              Resume a Quick Consult case
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {parallelCases.map(pc => (
                <div
                  key={pc.id}
                  onClick={() => onElevateParallel && onElevateParallel(pc)}
                  style={{
                    padding: '16px',
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFF'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', display: 'grid', placeItems: 'center' }}>
                      <Stethoscope size={16} color="#475569" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{pc.title}</h4>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{pc.date}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#94A3B8" />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showImportModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#FFF', borderRadius: '24px', padding: '24px',
                width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Import Existing Case</h3>
                <button onClick={() => setShowImportModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="#64748B" />
                </button>
              </div>
              
              {historyCases.length === 0 ? (
                <p style={{ color: '#64748B', textAlign: 'center', padding: '20px' }}>No past cases found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {historyCases.map(hc => (
                    <div
                      key={hc.id}
                      onClick={() => handleImportCase(hc)}
                      style={{
                        padding: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                        borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = '#ECFDF5'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
                    >
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{hc.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>{hc.date} &bull; {hc.type.toUpperCase()}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}"""

content = content.replace(old_return_end, new_return_end)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
