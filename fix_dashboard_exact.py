import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "<FatigueModeToggle />"
end_str = '<div style={{ paddingBottom: "24px" }}><FitnessNav /></div>'

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    
    new_block = """<FatigueModeToggle />
        
        <div style={{ padding: '0 24px 32px 24px', marginTop: '-8px' }}>
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
        </div>
        
        <div style={{ paddingBottom: "32px", borderTop: "1px solid rgba(0,0,0,0.03)", paddingTop: "32px" }}>
          <FitnessNav />
        </div>"""
    
    content = content.replace(old_block, new_block)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully via substring")
else:
    print("Could not find start or end bounds")
