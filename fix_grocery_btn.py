import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dietician\Dietician.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_grocery_header = """              <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={copyGroceryListText}"""

new_grocery_header = """              <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleGenerateGrocery}
                    disabled={isGeneratingGrocery}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFF',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      opacity: isGeneratingGrocery ? 0.7 : 1,
                    }}
                  >
                    <Sparkles size={15} />
                    {isGeneratingGrocery ? 'Generating...' : 'Auto-Generate from Plan'}
                  </button>
                  <button
                    onClick={copyGroceryListText}"""

if "Auto-Generate from Plan" not in content:
    content = content.replace(old_grocery_header, new_grocery_header)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Auto-Generate button")
else:
    print("Already added")
