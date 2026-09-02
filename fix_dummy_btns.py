import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianDashboardTracker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Snap Gallery button
content = re.sub(
    r'<button style=\{\{\s*background: \'#FFF\',\s*padding: \'16px\',\s*borderRadius: \'16px\',\s*border: \'none\',\s*display: \'flex\',\s*alignItems: \'center\',\s*gap: \'12px\',\s*boxShadow: \'0 2px 10px rgba\(0,0,0,0\.03\)\',\s*cursor: \'pointer\',\s*fontWeight: 700,\s*color: \'#0F172A\',\s*fontSize: \'14px\'\s*\}\}>\s*<div.*?Camera.*?</div>\s*Snap Gallery\s*</button>',
    r'''<button onClick={onSnap} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ background: '#0F172A', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={16} color="#FFF" />
            </div>
            Snap Gallery
          </button>''',
    content,
    flags=re.DOTALL
)

# Replace Saved Meals button
content = re.sub(
    r'<button style=\{\{\s*background: \'#FFF\',\s*padding: \'16px\',\s*borderRadius: \'16px\',\s*border: \'none\',\s*display: \'flex\',\s*alignItems: \'center\',\s*gap: \'12px\',\s*boxShadow: \'0 2px 10px rgba\(0,0,0,0\.03\)\',\s*cursor: \'pointer\',\s*fontWeight: 700,\s*color: \'#0F172A\',\s*fontSize: \'14px\'\s*\}\}>\s*<div.*?BookOpen.*?</div>\s*Saved Meals\s*</button>',
    r'''<button onClick={() => onLogMeal('Saved Meal')} style={{ background: '#FFF', padding: '16px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', fontWeight: 700, color: '#0F172A', fontSize: '14px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ background: '#0F172A', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} color="#FFF" />
            </div>
            Saved Meals
          </button>''',
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added onClick to buttons.")
