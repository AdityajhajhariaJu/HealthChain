import re

with open('src/features/mdt/MDTComponents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the import button from inside the textarea
old_import_btn = """                <button
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
                </button>"""

if old_import_btn in content:
    content = content.replace(old_import_btn, "")
else:
    print("Could not find old import button")

# Insert the button just above Deploy AI Agents
deploy_btn_target = """            <button
              onClick={() => {"""

new_import_btn = """            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
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
              onClick={() => {"""

if deploy_btn_target in content:
    content = content.replace(deploy_btn_target, new_import_btn)
else:
    print("Could not find deploy button target")

with open('src/features/mdt/MDTComponents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
