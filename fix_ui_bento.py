import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "        <div style={{ padding: '0 24px 32px 24px', marginTop: '-8px' }}>"
end_str = '        <div style={{ paddingBottom: "32px", borderTop: "1px solid rgba(0,0,0,0.03)", paddingTop: "32px" }}>'

idx1 = content.find(start_str)
idx2 = content.find(end_str)

if idx1 != -1 and idx2 != -1:
    new_block = """        <div style={{ padding: '0 24px 24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 16px', color: '#0F172A', letterSpacing: '-0.5px' }}>Dashboard</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            
            {/* The War Room Bento Tile (Massive Vertical Card) */}
            <div 
              onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
              style={{ 
                gridRow: 'span 2', 
                background: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600) center/cover', 
                borderRadius: '32px', 
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '0 16px 32px rgba(139, 92, 246, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                minHeight: '220px'
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.9) 100%)' }} />
              
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.2)' }}>
                   <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981', animation: 'pulse 2s infinite' }} />
                   <span style={{ fontSize: '10px', fontWeight: 800, color: '#FFF', letterSpacing: '0.5px' }}>LIVE</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px', borderRadius: '50%', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <ChevronRight size={16} color="#FFF" />
                </div>
              </div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                 <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>Health<br/>Canvas</h3>
                 <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 500 }}>Multi-agent sync</p>
              </div>
            </div>

            {/* Task Bento Tiles */}
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
            ))}
          </div>
        </div>\n\n"""
    
    content = content[:idx1] + new_block + content[idx2:]
    
    # Add Check icon to lucide-react if needed, wait I used ChevronRight and Clock which are already imported
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Bento grid injected!")
else:
    print("Could not find start/end indices")
