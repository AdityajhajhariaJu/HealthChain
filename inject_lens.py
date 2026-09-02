import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'ARGroceryLens' not in content:
    content = content.replace("import { triggerHapticLight }", "import { ARGroceryLens } from '../../components/ui/ARGroceryLens';\nimport { triggerHapticLight }")

# Add state
if 'showARLens' not in content:
    content = content.replace("const [showFrictionModal, setShowFrictionModal] = useState(false);", "const [showFrictionModal, setShowFrictionModal] = useState(false);\n  const [showARLens, setShowARLens] = useState(false);")

# Add the UI Tile and the ARGroceryLens overlay
ar_tile = """
              {/* AR Lens Bento Tile */}
              <div 
                onClick={() => { triggerHapticLight(); setShowARLens(true); }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  borderRadius: '32px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  minHeight: '140px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scan size={20} color="#FFF" />
                  </div>
                  <div style={{ background: '#EF4444', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px' }}>
                    NEW
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.3px' }}>Clinical Lens</h4>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontWeight: 500 }}>Scan food for glycemic spikes</p>
                </div>
              </div>

              {/* Task Bento Tiles */}
"""

if 'AR Lens Bento Tile' not in content:
    content = content.replace("{/* Task Bento Tiles */}", ar_tile)

# Add the overlay rendering at the end of the return statement before the final </div>
if '<ARGroceryLens' not in content:
    # Find the end of the render block. Just insert it before <FitnessNav />
    content = content.replace("<FitnessNav />", "<FitnessNav />\n          {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CaseDashboard.tsx")
