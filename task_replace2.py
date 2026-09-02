import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_tasks = r"""              {/* Task Bento Tiles */}
              {dailyTasks.map((task, idx) => (
                <div 
                  key={task.id}
                  onClick={() => {
                    triggerHapticLight();
                    if (task.id === 'task_2') setShowFrictionModal(true);
                    if (task.id === 'task_default') navigate('/app/profile');
                  }}
                  style={{
                    background: '#FFF',
                    borderRadius: '32px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                    border: '1px solid #F8FAFC',
                    minHeight: '140px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: task.id === 'task_default_done' ? '#10B981' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                       {task.id === 'task_default_done' ? <ChevronRight size={20} color="#FFF" /> : <Clock size={20} color="#64748B" />}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.3px' }}>{task.title}</h4>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, fontWeight: 500 }}>{task.subtitle}</p>
                  </div>
                </div>
              ))}"""

new_tasks = r"""              {/* Task Bento Tiles (Glassmorphic Scalloped) */}
              {dailyTasks.map((task, idx) => (
                <div 
                  key={task.id}
                  onClick={() => {
                    triggerHapticLight();
                    if (task.id === 'task_2') setShowFrictionModal(true);
                    if (task.id === 'task_default') navigate('/app/profile');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(107,155,158,0.9), rgba(74,122,125,0.7))',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRadius: '160px 160px 24px 24px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    minHeight: '260px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: task.id === 'task_default_done' ? '#10B981' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                       {task.id === 'task_default_done' ? <ChevronRight size={20} color="#FFF" /> : <Clock size={20} color="#FFF" />}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px', color: '#FFF', lineHeight: 1.2, letterSpacing: '-0.3px' }}>{task.title}</h4>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600 }}>{task.subtitle}</p>
                  </div>
                </div>
              ))}"""

content = content.replace(old_tasks, new_tasks)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Task tiles replaced!")
