import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change body background
content = content.replace("if (el) { el.style.backgroundColor = '#FFF7ED'; }", "if (el) { el.style.backgroundColor = '#EDE8E3'; }")

# Regex to match from the final `return (` to the start of `Medical Records & Labs`
pattern = re.compile(r'(\s*return \(\s*<>\s*<div style=\{\{ padding: isMobile \? \'16px\' : \'32px\', maxWidth: \'800px\', margin: \'0 auto\', paddingBottom: \'100px\', position: \'relative\' \}\}>\s*)<div.*?<label style=\{\{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', fontWeight: 800, color: \'#0F172A\', marginBottom: \'12px\' \}\}>\s*<span>Medical Records & Labs</span>', re.DOTALL)

match = pattern.search(content)
if match:
    prefix = match.group(1)
    
    new_render = r"""
        <div
          style={{
            background: 'linear-gradient(180deg, #F5F1ED 0%, #D8CFC4 100%)', 
            borderRadius: isMobile ? '0 0 80px 80px' : '160px 160px 24px 24px', 
            padding: isMobile ? '40px 24px' : '56px 40px', 
            margin: isMobile ? '-16px -16px 24px -16px' : '0 0 24px 0',
            position: 'relative', 
            overflow: 'hidden', 
            boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.7), 0 20px 40px rgba(0,0,0,0.05)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid #FFF'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")', mixBlendMode: 'overlay' }} />
          
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }}>
            <JarvisCoreOrange size={isMobile ? 240 : 320} color="#AA8C2C" />
          </div>
          
          <div style={{ position: 'relative', zIndex: 1, maxWidth: isMobile ? '100%' : '80%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', marginTop: '-56px' }}>
               <div style={{ width: '2px', height: '80px', background: 'linear-gradient(to bottom, #D4AF37, #AA8C2C)' }} />
               <div style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', border: '1px solid #AA8C2C', padding: '6px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(170,140,44,0.1)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#AA8C2C', animation: 'pulse 3s infinite' }} />
                  <span style={{ color: '#4A423A', fontWeight: 800, fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'serif' }}>J.A.R.V.I.S. Engine</span>
               </div>
            </div>
            
            <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 500, color: '#4A423A', margin: '0 0 20px 0', letterSpacing: '-0.5px', fontFamily: 'serif' }}>
              Uncover the missing link.
            </h2>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.5)', color: '#4A423A', borderRadius: '24px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Search size={14} /> Unvarnished Insights</span>
              <span style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6B9B9E 0%, #4A7A7D 100%)', color: '#FFF', borderRadius: '24px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(74, 122, 125, 0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}><CheckCircle2 size={14} /> One-Shot</span>
            </div>
            
            <p style={{ color: '#7A6E62', fontSize: '14px', margin: '0', fontWeight: 500, lineHeight: 1.6, maxWidth: '440px' }}>
              We crunch all your data and extract precise, actionable insights. No chat, no back-and-forth—just upload your history and discover patterns your doctors missed.
            </p>
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #6B9B9E 0%, #4A7A7D 100%)', 
          borderRadius: '80px 80px 24px 24px', 
          padding: isMobile ? '32px 24px' : '48px', 
          boxShadow: 'inset 0 4px 12px rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#FFF'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, color: '#FFF', marginBottom: '16px', fontFamily: 'serif', fontSize: '20px' }}>
              <span>Clinical Timeline & Symptoms</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#4A7A7D', padding: '6px 12px', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: 'none', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Raw Text</span>
            </label>
            <textarea 
              value={history}
              onChange={(e) => {
                const text = e.target.value;
                const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length <= 800 || text.length < history.length) {
                  setHistory(text);
                }
              }}
              placeholder="Paste years of notes, symptom timelines, or primary concerns here (Max 800 words)..."
              style={{ width: '100%', height: '180px', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.2)', resize: 'vertical', fontSize: '15px', fontFamily: 'inherit', background: 'rgba(255,255,255,0.1)', color: '#FFF', transition: 'all 0.2s', outline: 'none' }}
              onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.15)'; e.target.style.borderColor = 'rgba(255,255,255,0.5)'; }}
              onBlur={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            />
            <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600, color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) ? '#FFAA99' : 'rgba(255,255,255,0.6)', marginTop: '12px' }}>
              {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, color: '#FFF', marginBottom: '16px', fontFamily: 'serif', fontSize: '20px' }}>
            <span>Medical Records & Labs</span>"""
    
    content = content[:match.start()] + prefix + new_render + content[match.end():]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success Regex.")
else:
    print("Regex failed.")
