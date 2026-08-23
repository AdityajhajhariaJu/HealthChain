with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Generate connection map when report is ready
old_effect = """  useEffect(() => {
    if (!report && !isRetrying) {
      fetchReport();
    }
  }, [report, isRetrying]);"""

new_effect = """  useEffect(() => {
    if (!report && !isRetrying) {
      fetchReport();
    }
  }, [report, isRetrying]);

  useEffect(() => {
    if (report && report.topDiagnoses && !connectionMap) {
      const fetchMap = async () => {
        try {
          const mapData = await generateCaseConnectionMap(report.topDiagnoses);
          setConnectionMap(mapData);
        } catch (e) {
          console.error("Failed to generate map", e);
        }
      };
      fetchMap();
    }
  }, [report, connectionMap]);"""

content = content.replace(old_effect, new_effect)

# Render CaseConnectionMap
old_render = """        <div style={{ marginBottom: '32px' }}>
          <RichReportTemplate report={report} isMobile={isMobile} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#0F172A', marginBottom: '16px' }}>
            Possible pathways to discuss
          </h3>"""

new_render = """        <div style={{ marginBottom: '32px' }}>
          <RichReportTemplate report={report} isMobile={isMobile} />
        </div>

        {connectionMap && (
          <div style={{ marginBottom: '32px', background: '#0F172A', borderRadius: '24px', padding: isMobile ? '16px' : '32px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, color: '#FFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={20} color="#38BDF8" /> Clinical Correlation Constellation
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>
              Advanced semantic mapping of overlapping symptoms and cross-specialty correlations.
            </p>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <CaseConnectionMap data={connectionMap} isMobile={isMobile} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#0F172A', marginBottom: '16px' }}>
            Possible pathways to discuss
          </h3>"""

content = content.replace(old_render, new_render)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
