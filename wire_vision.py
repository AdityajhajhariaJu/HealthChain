import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\ARGroceryLens.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import for analyzeFoodImage
if "analyzeFoodImage" not in content:
    content = content.replace("import { getProfile }", "import { getProfile }\nimport { analyzeFoodImage } from '../../services/geminiService';")

# 2. Add state for the analysis result
state_find = "const profile = getProfile();"
state_replace = """const profile = getProfile();
  const [analysis, setAnalysis] = useState<any>(null);"""
content = content.replace(state_find, state_replace)

# 3. Modify handleScan
handle_scan_find = """  const handleScan = () => {
    triggerHapticLight();
    setIsScanning(true);
    
    // Simulate AI vision analysis delay
    setTimeout(() => {
      triggerHapticWarning();
      setIsScanning(false);
      setShowResults(true);
    }, 2500);
  };"""

handle_scan_replace = """  const handleScan = async () => {
    if (!videoRef.current) return;
    
    triggerHapticLight();
    setIsScanning(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const result = await analyzeFoodImage(base64, profile);
        setAnalysis(result);
        
        if (result.warning) {
          triggerHapticWarning();
        } else {
          triggerHapticSuccess();
        }
        setShowResults(true);
      }
    } catch (e) {
      console.error(e);
      // Fallback or handle error
    } finally {
      setIsScanning(false);
    }
  };"""

content = content.replace(handle_scan_find, handle_scan_replace)

# 4. Modify the UI to use nalysis state
ui_find = """<div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', padding: '6px 12px', borderRadius: '8px', width: 'fit-content', marginBottom: '16px' }}>
                <AlertTriangle size={14} color="#EF4444" />
                <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>HIGH GLYCEMIC SPIKE</span>
              </div>
              
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Sugar Loops Cereal</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>Analyzed against your pre-diabetic profile.</p>
              
              {/* Comparative Chart */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  <span>Sugar per serving ({scannedSugar}g)</span>
                  <span style={{ color: '#EF4444' }}>{Math.round(sugarPercentage)}% of daily max</span>
                </div>
                <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: sugarPercentage + '%' }}
                    transition={{ duration: 1, delay: 0.2, type: 'spring' }}
                    style={{ height: '100%', background: '#EF4444', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>

            {/* Better Alternative Card */}
            <div style={{
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '16px',
              display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #E2E8F0', boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
            }}>
              <div style={{ width: '48px', height: '64px', background: '#F1F5F9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>
                dY
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', letterSpacing: '0.5px', marginBottom: '4px' }}>BETTER ALTERNATIVE</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Oat & Seed Fuel</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>+20g Protein. 3g Sugar. Aisle 4.</div>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#F1F5F9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0F172A' }}>
                <ArrowRight size={16} />
              </div>
            </div>"""

ui_replace = """{analysis?.warning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', padding: '6px 12px', borderRadius: '8px', width: 'fit-content', marginBottom: '16px' }}>
                  <AlertTriangle size={14} color="#EF4444" />
                  <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{analysis.warning}</span>
                </div>
              )}
              
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{analysis?.foodName || 'Unknown Food'}</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>Analyzed against your profile ({analysis?.servingSize}).</p>
              
              {/* Macro Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Calories</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.calories} kcal</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Protein</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.protein}g</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Carbs (Sugar: {analysis?.sugar}g)</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.carbs}g</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Fats</div>
                  <div style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{analysis?.fats}g</div>
                </div>
              </div>
            </div>

            {/* Better Alternative Card */}
            {analysis?.betterAlternative && (
              <div style={{
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #E2E8F0', boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', letterSpacing: '0.5px', marginBottom: '4px' }}>BETTER ALTERNATIVE</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{analysis.betterAlternative.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{analysis.betterAlternative.reason}</div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#F1F5F9', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0F172A' }}>
                  <ArrowRight size={16} />
                </div>
              </div>
            )}"""

# We need to account for emoji in source code (dY) which might fail python matching.
# Let's use regex to replace the UI block safely.
import re

ui_start = r"<div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', padding: '6px 12px'"
ui_end = r"<ArrowRight size={16} />\s*</div>\s*</div>"

content = re.sub(ui_start + r".*?" + ui_end, ui_replace.replace('\\', '\\\\'), content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added true Vision API integration!")
