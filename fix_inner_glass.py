import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Inner icon Clinical Lens
content = content.replace(
    "background: '#0F172A', display: 'flex',",
    "background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(15,23,42,0.3), inset 0 2px 4px rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex',"
)

# Inner icon Task Bento
content = content.replace(
    "background: task.id === 'task_default_done' ? '#10B981' : '#F1F5F9', display: 'flex',",
    "background: task.id === 'task_default_done' ? 'linear-gradient(135deg, rgba(16,185,129,0.9) 0%, rgba(16,185,129,0.7) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: task.id === 'task_default_done' ? '0 4px 12px rgba(16,185,129,0.3), inset 0 2px 4px rgba(255,255,255,0.3)' : '0 4px 12px rgba(0,0,0,0.05), inset 0 2px 4px rgba(255,255,255,1)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated inner icons heavy glass")
