import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change main background
content = content.replace("backgroundColor: '#FBF9F6'", "backgroundColor: '#EDE8E3'")

start_str = "        <div style={{ padding: '0 24px 24px' }}>"
end_str = '        <div style={{ paddingBottom: "32px", borderTop: "1px solid rgba(0,0,0,0.03)", paddingTop: "32px" }}>'

idx1 = content.find(start_str)
idx2 = content.find(end_str)

if idx1 != -1 and idx2 != -1:
    new_block = """        <div style={{ padding: '0 24px 24px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 500, margin: '0 0 20px', color: '#4A423A', letterSpacing: '-0.5px', fontFamily: 'serif' }}>Dashboard</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            
            {/* The Architectural Arch (Canvas) */}
            <div 
              onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
              style={{ 
                gridRow: 'span 2', 
                background: 'linear-gradient(180deg, #F5F1ED 0%, #D8CF_C4 100%)', 
                borderRadius: '160px 160px 24px 24px', 
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.7), 0 20px 40px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '32px 24px 24px 24px',
                minHeight: '260px',
                border: '1px solid #FFF'
              }}
            >
              {/* Textured Plaster Background Effect */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")', mixBlendMode: 'overlay' }} />
              
              {/* Hanging Brass Pendant Light */}
              <div style={{ position: 'absolute', top: 0, right: '50%', transform: 'translateX(50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div style={{ width: '2px', height: '80px', background: 'linear-gradient(to bottom, #D4AF37, #AA8C2C)' }} />
                 <div style={{ width: '26px', height: '36px', border: '2px solid #AA8C2C', borderRadius: '13px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', marginTop: '-4px', background: 'transparent', zIndex: 2 }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#FFF', boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(212,175,55,0.4)', animation: 'pulse 3s infinite' }} />
                 </div>
              </div>
              
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginTop: '40px' }}>
                 <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#4A423A', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.3px', fontFamily: 'serif' }}>Health<br/>Canvas</h3>
                 <p style={{ fontSize: '11px', color: '#8A7D70', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Dr. Jenkins</p>
              </div>
            </div>

            {/* Scalloped Velvet Task Tiles */}
            {dailyTasks.map((task, idx) => (
              <div 
                key={task.id}
                onClick={() => {
                  triggerHapticLight();
                  if (task.id === 'task_2') setShowFrictionModal(true);
                  if (task.id === 'task_default') navigate('/app/profile');
                }}
                style={{
                  background: 'linear-gradient(135deg, #6B9B9E 0%, #4A7A7D 100%)',
                  borderRadius: '100px 100px 20px 20px',
                  padding: '16px 16px 20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.2), 0 12px 24px rgba(74, 122, 125, 0.25)',
                  minHeight: '130px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                   {task.id === 'task_default_done' ? <ChevronRight size={20} color="#FFF" /> : <Clock size={20} color="#FFF" />}
                </div>
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px', color: '#FFF', lineHeight: 1.2 }}>{task.title}</h4>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 500 }}>{task.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>\n\n"""
    
    # Fix the typo in color hex #D8CF_C4
    new_block = new_block.replace('#D8CF_C4', '#D8CFC4')
    
    content = content[:idx1] + new_block + content[idx2:]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Architectural style injected!")
else:
    print("Could not find bounds.")
