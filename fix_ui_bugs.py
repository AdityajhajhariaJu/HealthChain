import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """      <div style={{
        width: '100%',
        backgroundColor: '#FBF9F6', // Premium creme background for Apple style
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
        overflowX: 'hidden'
      }}>
        <FatigueModeToggle />"""

restored_jsx = """
        <div style={{ padding: '24px 24px 0 24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A', letterSpacing: '-0.5px' }}>Daily Clinical Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dailyTasks.map(task => (
              <div key={task.id} onClick={() => task.id === 'task_2' && setShowFrictionModal(true)}>
                <CinematicCheckbox label={task.title} sublabel={task.subtitle} />
              </div>
            ))}
            <div onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFF', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginTop: '8px', boxShadow: '0 12px 32px rgba(15,23,42,0.2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Enter Collaborative Health Canvas</span>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>1 new note from Dr. Jenkins</span>
              </div>
              <ChevronRight size={20} color="#FFF" />
            </div>
          </div>
        </div>
        <div style={{ paddingBottom: "24px" }}><FitnessNav /></div>
"""

content = content.replace(target, target + restored_jsx)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Restored Daily Clinical Actions and FitnessNav")
