import sys
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\components\ui\ARGroceryLens.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the SVG Graph UI just before the Macro Grid
graph_ui = """
              {/* Glycemic Spike Graph */}
              {analysis?.sugar > 0 && (
                <div style={{ marginBottom: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>GLYCEMIC RESPONSE</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: analysis.sugar > 20 ? '#EF4444' : '#10B981' }}>
                      {analysis.sugar > 20 ? 'High Spike' : 'Stable'}
                    </span>
                  </div>
                  <div style={{ height: '60px', width: '100%', position: 'relative' }}>
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <path 
                        d={analysis.sugar > 20 ? "M0,35 Q30,35 45,5 T55,5 Q70,35 100,35" : "M0,35 Q50,30 100,35"} 
                        fill="none" 
                        stroke={analysis.sugar > 20 ? "url(#spikeGradient)" : "url(#stableGradient)"} 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                      />
                      <defs>
                        <linearGradient id="spikeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#EF4444" stopOpacity="1" />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="stableGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px', textAlign: 'center' }}>
                    Sugar Content: {analysis.sugar}g / serving
                  </div>
                </div>
              )}
              
              {/* Macro Grid */}
"""

content = content.replace("{/* Macro Grid */}", graph_ui)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated ARGroceryLens.tsx")
