import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\ARGroceryLens.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add targets near the top of the component
targets = """  const [analysis, setAnalysis] = useState<any>(null);

  const targetCalories = profile?.targetCalories || 2000;
  const targetProtein = Math.round((targetCalories * 0.3) / 4);
  const targetCarbs = Math.round((targetCalories * 0.4) / 4);
  const targetFats = Math.round((targetCalories * 0.3) / 9);
  const targetSugar = 36;
"""
content = content.replace("  const [analysis, setAnalysis] = useState<any>(null);", targets)


old_macro = """              {/* Macro Grid */}
  
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
                </div>"""

new_macro = """              {/* Nutritional Impact Graphs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Calories', val: analysis?.calories || 0, target: targetCalories, unit: 'kcal', color: '#3B82F6' },
                  { label: 'Protein', val: analysis?.protein || 0, target: targetProtein, unit: 'g', color: '#10B981' },
                  { label: 'Carbs', val: analysis?.carbs || 0, target: targetCarbs, unit: 'g', color: '#F59E0B' },
                  { label: 'Sugar', val: analysis?.sugar || 0, target: targetSugar, unit: 'g', color: '#EF4444' },
                  { label: 'Fats', val: analysis?.fats || 0, target: targetFats, unit: 'g', color: '#8B5CF6' },
                ].map((stat, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      <span>{stat.label}</span>
                      <span style={{ color: '#64748B' }}>{stat.val}{stat.unit} <span style={{ fontWeight: 400 }}>/ {stat.target}{stat.unit}</span></span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stat.val / stat.target) * 100, 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                        style={{ height: '100%', background: stat.color, borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>"""

content = content.replace(old_macro, new_macro)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added progress bars")
