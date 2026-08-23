import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix subtext
old_subtext = "<p style={{ color: '#0F8B7E', fontSize: '13px', margin: 0, fontWeight: 600, opacity: 0.85 }}>Don't leave any symptom out — every detail matters.</p>"
new_subtext = """<p style={{ color: '#0F8B7E', fontSize: '13px', margin: 0, fontWeight: 600, opacity: 0.85 }}>Don't leave any symptom out — every detail matters.</p>
            <p style={{ color: '#475569', fontSize: '12px', margin: '8px 0 0 0', fontWeight: 500, lineHeight: 1.5, maxWidth: '80%' }}>
              <strong>Not satisfied with a previous diagnosis?</strong> Have new lab results or changing symptoms? Import your existing case below and explicitly cross-question the AI on its previous findings to get a completely revised evaluation.
            </p>"""
            
if old_subtext in content:
    content = content.replace(old_subtext, new_subtext)
else:
    # Try alternate encoding character for emdash
    old_subtext2 = "<p style={{ color: '#0F8B7E', fontSize: '13px', margin: 0, fontWeight: 600, opacity: 0.85 }}>Don't leave any symptom out ?\" every detail matters.</p>"
    content = content.replace(old_subtext2, new_subtext)

# Fix buttons
old_buttons = """              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
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
              </button>"""

new_buttons = """              <div style={{ position: 'absolute', bottom: '12px', left: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
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
                  <Upload size={12} /> Upload lab reports also
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  style={{
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
              </div>"""

content = content.replace(old_buttons, new_buttons)

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
