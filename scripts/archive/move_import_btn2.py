import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the new layout with an even better one: putting them side-by-side!
old_layout = """            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: '#64748B',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.2s',
                  textDecoration: 'underline'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#64748B'; }}
              >
                <GitMerge size={14} /> Import existing case
              </button>
            </div>

            <button
              onClick={() => {
                try { sessionStorage.removeItem('hc_mdt_intake_draft'); } catch(e){} 
                onComplete({ chiefComplaint: complaint, files: selectedFiles });
              }}
              disabled={!complaint.trim() || isPreparing}
              style={{
                alignSelf: 'flex-end',
                padding: '16px 32px',
                background: complaint.trim() && !isPreparing ? '#0F172A' : '#E2E8F0',
                color: '#FFF',
                border: 'none',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '16px',
                cursor: complaint.trim() && !isPreparing ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {isPreparing ? 'Preparing...' : 'Deploy AI Agents'} <ArrowRight size={18} />
            </button>"""

new_layout = """            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  color: '#64748B',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = '#64748B'; }}
              >
                <GitMerge size={16} /> Import existing case
              </button>

              <button
                onClick={() => {
                  try { sessionStorage.removeItem('hc_mdt_intake_draft'); } catch(e){} 
                  onComplete({ chiefComplaint: complaint, files: selectedFiles });
                }}
                disabled={!complaint.trim() || isPreparing}
                style={{
                  padding: '16px 32px',
                  background: complaint.trim() && !isPreparing ? '#0F172A' : '#E2E8F0',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: complaint.trim() && !isPreparing ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {isPreparing ? 'Preparing...' : 'Deploy AI Agents'} <ArrowRight size={18} />
              </button>
            </div>"""

if old_layout in content:
    content = content.replace(old_layout, new_layout)
else:
    print("Could not find old layout")

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
