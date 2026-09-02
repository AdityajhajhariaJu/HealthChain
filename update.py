import os
import re

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianComponents.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'weightUnit:' not in content:
    content = content.replace("weight: coreProfile?.weight ? String(coreProfile.weight) : '',", "weight: coreProfile?.weight ? String(coreProfile.weight) : '',\n        weightUnit: 'kg',\n        heightUnit: 'cm',")

content = content.replace(
    "['North Indian', 'South Indian', 'Mediterranean', 'Western', 'Keto', 'Any'].map((c)",
    "['North Indian', 'South Indian', 'Mediterranean', 'US / Western', 'European', 'East Asian', 'Keto', 'Any'].map((c)"
)

weight_input_regex = r'<input[^>]*placeholder="e\.g\., 70"[^>]*>'
new_weight_input = '''<div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder={data.weightUnit === 'kg' ? "e.g., 70" : "e.g., 150"}
                  value={data.weight}
                  onChange={(e) => setData({ ...data, weight: e.target.value })}
                  style={{
                    flex: 1, padding: '16px', borderRadius: '16px', border: '2px solid #E2E8F0', fontSize: '16px', outline: 'none'
                  }}
                />
                <button
                  onClick={() => setData({ ...data, weightUnit: data.weightUnit === 'kg' ? 'lbs' : 'kg' })}
                  style={{ padding: '0 20px', borderRadius: '16px', border: 'none', background: '#F1F5F9', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                >
                  {data.weightUnit.toUpperCase()}
                </button>
              </div>'''

content = re.sub(weight_input_regex, new_weight_input, content)

height_input_regex = r'<input[^>]*placeholder="e\.g\., 170"[^>]*>'
new_height_input = '''<div style={{ display: 'flex', gap: '8px' }}>
                {data.heightUnit === 'cm' ? (
                  <input
                    type="number"
                    placeholder="e.g., 170"
                    value={data.height}
                    onChange={(e) => setData({ ...data, height: e.target.value })}
                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '2px solid #E2E8F0', fontSize: '16px', outline: 'none' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flex: 1, gap: '8px' }}>
                    <input
                      type="number" placeholder="ft"
                      value={data.height.split('.')[0] || ''}
                      onChange={(e) => setData({ ...data, height: e.target.value + '.' + (data.height.split('.')[1] || '0') })}
                      style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '2px solid #E2E8F0', fontSize: '16px', outline: 'none', width: '100%' }}
                    />
                    <input
                      type="number" placeholder="in"
                      value={data.height.split('.')[1] || ''}
                      onChange={(e) => setData({ ...data, height: (data.height.split('.')[0] || '0') + '.' + e.target.value })}
                      style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '2px solid #E2E8F0', fontSize: '16px', outline: 'none', width: '100%' }}
                    />
                  </div>
                )}
                <button
                  onClick={() => setData({ ...data, heightUnit: data.heightUnit === 'cm' ? 'ft' : 'cm', height: '' })}
                  style={{ padding: '0 20px', borderRadius: '16px', border: 'none', background: '#F1F5F9', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                >
                  {data.heightUnit.toUpperCase()}
                </button>
              </div>'''

content = re.sub(height_input_regex, new_height_input, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Onboarding Wizard!")
