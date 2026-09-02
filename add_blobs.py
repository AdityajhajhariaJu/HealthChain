import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        <div style={{ 
          margin: '0 0 40px 0', 
          paddingTop: '24px', 
          background: 'rgba(255, 255, 255, 0.4)', 
          backdropFilter: 'blur(30px)', 
          WebkitBackdropFilter: 'blur(30px)', 
          border: '1px solid rgba(255, 255, 255, 0.8)', 
          borderRadius: '32px', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 2px 0 rgba(255,255,255,0.7)', 
          overflow: 'hidden' 
        }}>"""

replacement = """        <div style={{ position: 'relative', margin: '0 0 40px 0' }}>
          {/* Calming aesthetic background blobs for the meditation glass card */}
          <div style={{ position: 'absolute', top: '5%', left: '0%', width: '200px', height: '200px', background: '#DDD6FE', borderRadius: '50%', filter: 'blur(60px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '40%', right: '0%', width: '250px', height: '250px', background: '#BAE6FD', borderRadius: '50%', filter: 'blur(70px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '5%', left: '10%', width: '150px', height: '150px', background: '#CCFBF1', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />

          <div style={{ 
            position: 'relative',
            zIndex: 1,
            paddingTop: '24px', 
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.2) 100%)', 
            backdropFilter: 'blur(30px)', 
            WebkitBackdropFilter: 'blur(30px)', 
            border: '1px solid rgba(255, 255, 255, 0.8)', 
            borderRadius: '32px', 
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.05), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.3)', 
            overflow: 'hidden' 
          }}>"""

if target in content:
    content = content.replace(target, replacement)
    
    # We also need to add a closing </div> for the new wrapper!
    # The end of the glass div was followed by {/* Articles for You */}
    target_end = """        </div>
          
      {/* Articles for You */}"""
    replacement_end = """        </div>
        </div>
          
      {/* Articles for You */}"""
    content = content.replace(target_end, replacement_end)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added blobs and upgraded glassmorphism")
else:
    print("Could not find the target wrapper to replace.")
