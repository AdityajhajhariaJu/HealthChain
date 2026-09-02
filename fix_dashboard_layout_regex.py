import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = r"(<FatigueModeToggle />\s*<div style={{ padding: '24px 24px 0 24px', marginBottom: '32px' }}>\s*<h2[^>]*>Daily Clinical Actions</h2>\s*<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>\s*\{dailyTasks\.map\(.*?\}\)\}\s*)<div onClick=\{\(\) => \{ triggerHapticLight\(\); navigate\('/app/war-room'\); \}\} style={{ background: 'linear-gradient\(135deg, #0F172A 0%, #1E293B 100%\)', color: '#FFF', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginTop: '8px', boxShadow: '0 12px 32px rgba\(15,23,42,0\.2\)' }}>\s*<div style={{ display: 'flex', flexDirection: 'column' }}>\s*<span style={{ fontSize: '16px', fontWeight: 700 }}>Enter Collaborative Health Canvas</span>\s*<span style={{ fontSize: '13px', color: '#94A3B8' }}>1 new note from Dr\. Jenkins</span>\s*</div>\s*<ChevronRight size=\{20\} color=\"#FFF\" />\s*</div>\s*</div>\s*</div>\s*<div style={{ paddingBottom: \"24px\" }}><FitnessNav /></div>"

new_layout = """<FatigueModeToggle />
        
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

content = re.sub(target, new_layout, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace completed")
