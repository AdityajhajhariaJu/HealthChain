import re

with open('src/features/mdt/MDTHubDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
if "import { SpecialistPanel } from './MultiSpecialistComponents';" not in content:
    content = content.replace(
        "import { MDTSpecialistPanel, MDTReportPanel } from './MDTComponents';",
        "import { MDTReportPanel } from './MDTComponents';\nimport { SpecialistPanel } from './MultiSpecialistComponents';"
    )

# 2. Add global cache
if "const cachedMDTSpecialistStreams: any = {};" not in content:
    content = content.replace(
        "export function MDTHubDashboard({",
        "const cachedMDTSpecialistStreams: any = {};\n\nexport function MDTHubDashboard({"
    )

# 3. Add completed state tracker
if "const [completedSpecialists, setCompletedSpecialists]" not in content:
    content = content.replace(
        "const navigate = useNavigate();",
        "const navigate = useNavigate();\n  const [completedSpecialists, setCompletedSpecialists] = React.useState<Set<string>>(new Set());"
    )

# 4. Remove the motion.div header entirely
header_regex = re.compile(r"<motion\.div\s+initial=\{\{\s*opacity:\s*0,\s*y:\s*10\s*\}\}\s+animate=\{\{\s*opacity:\s*1,\s*y:\s*0\s*\}\}.*?</motion\.div>", re.DOTALL)
content = header_regex.sub("", content)

# 5. Add a single top-level Cancel button and wrap SpecialistPanel with the QuickConsult-like header
# Find the specialist mapping logic
mapping_start = """            {selectedSpecialists.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: (!isMobile || mobileActiveTab === i) ? 'flex' : 'none',
                  flex: 1,"""

mapping_end = """                <MDTSpecialistPanel
                  specialist={s}
                  index={i}
                  isPaused={isSessionPaused}
                  allSpecialists={selectedSpecialists}
                  intakeData={intakeData}
                  initialMessages={specialistTranscripts[s.id] || []}
                  activeDifferentials={activeCase?.differentials || []}
                  onUpdate={(id, transcript) => {
                    setSpecialistTranscripts((prev) => ({ ...prev, [id]: transcript }));
                  }}
                  onComplete={(id, transcript) => {
                    setSpecialistTranscripts((prev) => {
                      const updated = { ...prev, [id]: transcript };
                      return updated;
                    });
                  }}
                />
              </div>
            ))}"""

new_mapping = """            {selectedSpecialists.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: (!isMobile || mobileActiveTab === i) ? 'flex' : 'none',
                  flexDirection: 'column',
                  flex: 1,
                  width: '100%',
                  height: isMobile ? 'calc(100vh - 240px)' : 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: s.bg || 'rgba(59, 130, 246, 0.1)', color: s.color || '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <s.icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{s.label}</h3>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>AI-guided question preparation</div>
                    </div>
                  </div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  <SpecialistPanel
                    specialist={s}
                    isRunning={true}
                    isPaused={false}
                    index={i}
                    onComplete={(id: string, transcript: any) => {
                      setSpecialistTranscripts((prev: any) => ({ ...prev, [id]: transcript }));
                      setCompletedSpecialists(prev => {
                        const next = new Set(prev);
                        next.add(id);
                        if (next.size === selectedSpecialists.length) {
                          setPhase('compiling');
                        }
                        return next;
                      });
                    }}
                    allSpecialists={selectedSpecialists}
                    intakeData={intakeData}
                    activeDifferentials={activeCase?.differentials || []}
                    cachedSpecialistStreams={cachedMDTSpecialistStreams}
                  />
                </div>
              </div>
            ))}"""

# Replace mapping
content = content.replace(mapping_start + "\n                  width: '100%',\n                  height: isMobile ? 'calc(100vh - 240px)' : 'auto',\n                }}\n              >\n" + mapping_end, new_mapping)

# Add the single Cancel button at the very top of the grid container
grid_start = """          <div
            style={{
              display: isMobile ? 'flex' : 'grid',"""

new_grid_start = """          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => {
                 setPhase('intake');
                 setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
                 setHistoryReport(null);
              }}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={16} /> Cancel Consultation
            </button>
          </div>
          <div
            style={{
              display: isMobile ? 'flex' : 'grid',"""

content = content.replace(grid_start, new_grid_start)

with open('src/features/mdt/MDTHubDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
