import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\jarvis\JarvisInvestigator.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the two disjointed divs with a connected layout like MDTComponents
find_str = """        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '24px', padding: isMobile ? '24px' : '40px', boxShadow: '0 20px 40px rgba(15,23,42,0.06)' }}>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
              <span>Clinical Timeline & Symptoms</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', padding: '4px 10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>Raw Text</span>
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
              style={{ width: '100%', height: '180px', padding: '20px', borderRadius: '16px', border: '2px solid #E2E8F0', resize: 'vertical', fontSize: '15px', fontFamily: 'inherit', background: '#F8FAFC', transition: 'border-color 0.2s', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
            />
            <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) ? '#EF4444' : '#94A3B8', marginTop: '8px' }}>
              {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
              <span>Medical Records & Labs</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', padding: '4px 10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>PDF / Images</span>
            </label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              multiple 
              accept="image/*,application/pdf"
              style={{ display: 'none' }} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', padding: '32px', background: '#F8FAFC', border: '2px dashed #CBD5E1', borderRadius: '16px', color: '#475569', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = '#38BDF8'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
            >
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '50%', boxShadow: '0 8px 16px rgba(0,0,0,0.06)' }}>
                <FileUp size={28} color="#0F172A" />
              </div>
              <span style={{ fontSize: '16px' }}>Upload PDFs or Photos</span>
            </button>"""

replace_str = """        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '24px', padding: isMobile ? '24px' : '40px', boxShadow: '0 20px 40px rgba(15,23,42,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
            <div style={{ position: 'relative' }}>
              <textarea 
                value={history}
                onChange={(e) => {
                  const text = e.target.value;
                  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                  if (words.length <= 800 || text.length < history.length) {
                    setHistory(text);
                  }
                }}
                placeholder="Paste years of notes, symptom timelines, or primary concerns here (Max 800 words)...\\n\\n(Optional: You can also attach lab reports, scans, or past records below)."
                style={{ width: '100%', minHeight: '160px', padding: '18px', borderRadius: '16px', border: '1px solid #E2E8F0', resize: 'vertical', fontSize: '15.5px', lineHeight: 1.6, fontFamily: 'inherit', background: '#FFF', color: '#0F172A', transition: 'border-color 0.2s', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                onFocus={(e) => e.target.style.borderColor = '#F97316'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                multiple 
                accept="image/*,application/pdf"
                capture="environment"
                style={{ display: 'none' }} 
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: isMobile ? '7px 12px' : '8px 16px',
                  background: '#F8FAFC',
                  color: '#475569',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '10px',
                  fontSize: isMobile ? '12.5px' : '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.color = '#0F172A'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#475569'; }}
              >
                <FileUp size={14} color="#64748B" />
                <span>Attach Lab Reports or Photos <span style={{ color: '#94A3B8', fontWeight: 500 }}>(Optional)</span></span>
              </button>
              <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) ? '#EF4444' : '#94A3B8' }}>
                {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
              </div>
            </div>"""

content = content.replace(find_str, replace_str)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated JarvisInvestigator.tsx to match deep collab layout")
