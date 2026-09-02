import sys

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\DieticianComponents.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_weight_ui = r"""            {/* Weight & Target Weight */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Scale size={13} color="#059669" /> Current Weight (kg)
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={data.weight}
                  onChange={(e) => setData({ ...data, weight: e.target.value })}
                  placeholder="e.g. 75"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Target size={13} color="#059669" /> Target Weight (kg)
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={data.targetWeight}
                  onChange={(e) => setData({ ...data, targetWeight: e.target.value })}
                  placeholder="e.g. 70"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
            </div>"""

new_weight_ui = r"""            {/* Unit Toggles */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '2px' }}>
                <button onClick={() => setData({...data, weightUnit: 'kg'})} style={{ background: data.weightUnit === 'kg' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.weightUnit === 'kg' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.weightUnit === 'kg' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>kg</button>
                <button onClick={() => setData({...data, weightUnit: 'lbs'})} style={{ background: data.weightUnit === 'lbs' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.weightUnit === 'lbs' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.weightUnit === 'lbs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>lbs</button>
              </div>
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '2px' }}>
                <button onClick={() => setData({...data, heightUnit: 'cm'})} style={{ background: data.heightUnit === 'cm' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.heightUnit === 'cm' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.heightUnit === 'cm' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>cm</button>
                <button onClick={() => setData({...data, heightUnit: 'ft'})} style={{ background: data.heightUnit === 'ft' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.heightUnit === 'ft' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.heightUnit === 'ft' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>ft/in</button>
              </div>
            </div>

            {/* Weight & Target Weight */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Scale size={13} color="#059669" /> Current Weight ({data.weightUnit})
                </label>
                <input
                  type="number"
                  min="20"
                  max="600"
                  value={data.weight}
                  onChange={(e) => setData({ ...data, weight: e.target.value })}
                  placeholder={data.weightUnit === 'kg' ? "e.g. 75" : "e.g. 165"}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Target size={13} color="#059669" /> Target Weight ({data.weightUnit})
                </label>
                <input
                  type="number"
                  min="20"
                  max="600"
                  value={data.targetWeight}
                  onChange={(e) => setData({ ...data, targetWeight: e.target.value })}
                  placeholder={data.weightUnit === 'kg' ? "e.g. 70" : "e.g. 150"}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
            </div>"""

if old_weight_ui in content:
    content = content.replace(old_weight_ui, new_weight_ui)
    print("Weight UI replaced")
else:
    print("Weight UI NOT FOUND")
    
old_height_ui = r"""            {/* Height & Age */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Ruler size={13} color="#059669" /> Height (cm)
                </label>
                <input
                  type="number"
                  min="50"
                  max="260"
                  value={data.height}
                  onChange={(e) => setData({ ...data, height: e.target.value })}
                  placeholder="e.g. 175"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Clock size={13} color="#059669" /> Age (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={data.age}
                  onChange={(e) => setData({ ...data, age: e.target.value })}
                  placeholder="e.g. 29"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
            </div>"""

new_height_ui = r"""            {/* Height & Age */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Ruler size={13} color="#059669" /> Height ({data.heightUnit})
                </label>
                {data.heightUnit === 'cm' ? (
                  <input
                    type="number"
                    min="50"
                    max="260"
                    value={data.height}
                    onChange={(e) => setData({ ...data, height: e.target.value })}
                    placeholder="e.g. 175"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: '1.5px solid #E2E8F0',
                      outline: 'none',
                      background: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#0F172A',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      min="3"
                      max="8"
                      value={data.heightFt}
                      onChange={(e) => setData({ ...data, heightFt: e.target.value })}
                      placeholder="ft"
                      style={{
                        width: '100%',
                        padding: '14px 12px',
                        borderRadius: '14px',
                        border: '1.5px solid #E2E8F0',
                        outline: 'none',
                        background: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#0F172A',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={data.heightIn}
                      onChange={(e) => setData({ ...data, heightIn: e.target.value })}
                      placeholder="in"
                      style={{
                        width: '100%',
                        padding: '14px 12px',
                        borderRadius: '14px',
                        border: '1.5px solid #E2E8F0',
                        outline: 'none',
                        background: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#0F172A',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      }}
                    />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Clock size={13} color="#059669" /> Age (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={data.age}
                  onChange={(e) => setData({ ...data, age: e.target.value })}
                  placeholder="e.g. 29"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
            </div>"""

if old_height_ui in content:
    content = content.replace(old_height_ui, new_height_ui)
    print("Height UI replaced")
else:
    print("Height UI NOT FOUND")
    
# Update validation button criteria
content = content.replace(
    "[data.weight, data.targetWeight, data.height, data.age, data.targetDays]",
    "(data.heightUnit === 'cm' ? [data.weight, data.targetWeight, data.height, data.age, data.targetDays] : [data.weight, data.targetWeight, data.heightFt, data.age, data.targetDays])"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

