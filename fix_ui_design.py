import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """          <div style={{ padding: '0 24px 32px 24px', marginTop: '-8px' }}>
            <div onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFF', padding: '20px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 12px 32px rgba(15,23,42,0.15)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>Collaborative Health Canvas</span>
                <span style={{ fontSize: '14px', color: '#94A3B8' }}>1 new note from Dr. Jenkins</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%' }}>
                <ChevronRight size={20} color="#FFF" />
              </div>
            </div>
          </div>
  
          <div style={{ padding: '0 24px 32px 24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A', letterSpacing: '-0.5px' }}>Daily Clinical Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dailyTasks.map(task => (
                <div key={task.id} onClick={() => {
                  triggerHapticLight();
                  if (task.id === 'task_2') setShowFrictionModal(true);
                  if (task.id === 'task_default') navigate('/app/profile');
                }} style={{ cursor: task.id === 'task_default' ? 'pointer' : 'default' }}>
                  <CinematicCheckbox label={task.title} sublabel={task.subtitle} initialChecked={task.id === 'task_default_done'} />
                </div>
              ))}
            </div>
          </div>"""

new_block = """          <div style={{ padding: '0 24px 32px 24px', marginTop: '-8px' }}>
            <div 
              onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
              style={{ 
                position: 'relative',
                overflow: 'hidden',
                padding: '24px', 
                borderRadius: '28px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                cursor: 'pointer', 
                boxShadow: '0 24px 48px rgba(15,23,42,0.12)',
                background: '#0F172A',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '150%', height: '200%', background: 'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.25) 0%, transparent 50%)', filter: 'blur(30px)', animation: 'spin 15s linear infinite' }} />
              <div style={{ position: 'absolute', bottom: '-50%', right: '-20%', width: '150%', height: '200%', background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.25) 0%, transparent 50%)', filter: 'blur(30px)', animation: 'spin 20s linear infinite reverse' }} />
              
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '10px', backdropFilter: 'blur(10px)', fontSize: '11px', fontWeight: 800, color: '#FFF', letterSpacing: '0.5px', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)' }}>Live Agent Team</div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981', animation: 'pulse 2s infinite' }} />
                </div>
                <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', color: '#FFF' }}>Health Canvas</span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>1 new note from Dr. Jenkins</span>
              </div>
              <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.1)', padding: '14px', borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={20} color="#FFF" />
              </div>
            </div>
          </div>
  
          <div style={{ padding: '0 24px 32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>Clinical Actions</h2>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', background: '#D1FAE5', padding: '4px 12px', borderRadius: '12px' }}>{dailyTasks.length} Pending</span>
            </div>
            
            <div style={{ 
              background: '#FFFFFF', 
              borderRadius: '24px', 
              padding: '6px', 
              boxShadow: '0 12px 32px rgba(0,0,0,0.03)',
              border: '1px solid #F1F5F9' 
            }}>
              {dailyTasks.map((task, index) => (
                <div key={task.id} onClick={() => {
                  triggerHapticLight();
                  if (task.id === 'task_2') setShowFrictionModal(true);
                  if (task.id === 'task_default') navigate('/app/profile');
                }} style={{ cursor: task.id === 'task_default' ? 'pointer' : 'default', padding: '6px', borderBottom: index < dailyTasks.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                  <CinematicCheckbox label={task.title} sublabel={task.subtitle} initialChecked={task.id === 'task_default_done'} />
                </div>
              ))}
            </div>
          </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Redesigned the dashboard section!")
else:
    print("Could not find the old block. Let's try exact string split.")
    start_str = "<div style={{ padding: '0 24px 32px 24px', marginTop: '-8px' }}>"
    end_str = "</div>\n          </div>"
    
    idx1 = content.find(start_str)
    # find the end of the Clinical Actions block
    # It's right before <div style={{ paddingBottom: "32px", borderTop: "1px solid rgba(0,0,0,0.03)", paddingTop: "32px" }}>
    end_tag = '<div style={{ paddingBottom: "32px", borderTop: "1px solid rgba(0,0,0,0.03)", paddingTop: "32px" }}>'
    idx2 = content.find(end_tag)
    
    if idx1 != -1 and idx2 != -1:
        content = content[:idx1] + new_block + "\n        " + content[idx2:]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Redesigned via string splitting!")
    else:
        print("Failed to replace!")
