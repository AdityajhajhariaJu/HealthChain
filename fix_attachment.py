with open('src/features/consultation/AvaHealthBuddy.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_attachment = '''                <div key={idx} style={{
                  background: '#F1F5F9',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '13px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #E2E8F0'
                }}>'''

new_attachment = '''                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  padding: '6px 12px',
                  borderRadius: '99px',
                  fontSize: '13px',
                  color: '#1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.05)'
                }}>'''

content = content.replace(old_attachment, new_attachment)

with open('src/features/consultation/AvaHealthBuddy.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated attachment pill")
